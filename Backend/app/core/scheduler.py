from ortools.sat.python import cp_model
from collections import defaultdict
from app.core.globals import schedule_dict, progress_state
from app.core.firebase import load_courses, load_rooms, load_time_settings, load_days
import logging
import math
import random
from typing import List, Dict, Tuple, Set, Optional
from enum import Enum
import time

logger = logging.getLogger("schedgeneration")

class SchedulingPhase(Enum):
    PHASE_1_FLEXIBLE = 1    # 1st year, lecture-only (easiest)
    PHASE_2_REGULAR = 2     # 2nd-3rd year, single blocks with labs
    PHASE_3_CRITICAL = 3    # 4th year, labs, multiple blocks (hardest)

class HierarchicalScheduler:
    """
    Multi-phase hierarchical scheduler that processes courses in layers
    to handle large variable counts while maintaining strict constraints.
    
    Key improvements:
    - Reversed phase order: easy problems first, hard problems last
    - Feasibility-first approach: hard constraints before soft objectives
    - Dynamic timeout adjustment based on phase difficulty
    - Better domain filtering and constraint management
    - Fallback strategies for timeout scenarios
    """
    
    def __init__(self, process_id=None):
        self.process_id = process_id
        self.all_courses = []
        self.rooms = {}
        self.time_settings = {}
        self.days = []
        
        # Time parameters
        self.start_t = 0
        self.end_t = 0
        self.inc_hr = 2
        self.inc_day = 0
        self.total_inc = 0
        self.lab_starts = []
        
        # Schedule tracking across phases
        self.global_schedule = []  # Now used to store cumulative schedule for prior fixed intervals
        self.occupied_slots = defaultdict(set)  # (room_type, room_idx) -> set of time slots
        self.section_occupied = defaultdict(set)  # (prog, yr, blk) -> set of time slots
        
        self.schedule_id = 1
        self.phase_stats = {}
        
        # Track courses with both lecture and lab units
        self.courses_with_both = set()
        
    def update_progress(self, value):
        """Update progress state if process_id exists"""
        if self.process_id:
            progress_state[self.process_id] = value
    
    def load_data(self):
        """Load and prepare all necessary data"""
        self.update_progress(5)
        
        courses = load_courses()
        self.all_courses = self.prioritize_and_partition_courses(courses)
        self.update_progress(15)
        
        self.rooms = load_rooms()
        # Log room counts for debugging
        if 'lecture' in self.rooms:
            logger.info(f"Loaded {len(self.rooms['lecture'])} lecture rooms")
        if 'lab' in self.rooms:
            logger.info(f"Loaded {len(self.rooms['lab'])} lab rooms")
        self.update_progress(25)
        
        self.time_settings = load_time_settings()
        self.update_progress(35)
        
        self.days = load_days()
        self.update_progress(45)
        
        self.setup_time_parameters()
        self.update_progress(50)
        
    def prioritize_and_partition_courses(self, courses):
        """
        Partition courses into scheduling phases based on complexity and priority.
        REVERSED: Start with flexible courses, end with critical ones.
        Returns list of (phase, course) tuples sorted by priority.
        """
        scored_courses = []
        
        for course in courses:
            # Track courses with both lecture and lab units
            has_lecture = course.get('unitsLecture', 0) > 0
            has_lab = course.get('unitsLab', 0) > 0
            if has_lecture and has_lab:
                self.courses_with_both.add(course['courseCode'])
            
            # Calculate complexity score
            priority_score = (
                course.get('yearLevel', 0) * 1000 +
                (course.get('unitsLecture', 0) + course.get('unitsLab', 0) * 2) * 100 +
                course.get('unitsLab', 0) * 50 +
                course.get('blocks', 1) * 10
            )
            
            # Determine phase based on constraints
            blocks = course.get('blocks', 1)
            year_level = course.get('yearLevel', 0)
            
            # Phase 1: Flexible courses (1st year, lecture-only) - EASIEST
            if year_level <= 1 and not has_lab:
                phase = SchedulingPhase.PHASE_1_FLEXIBLE
            # Phase 2: Regular courses (2nd-3rd year, single blocks with labs)
            elif year_level >= 2 and year_level < 4 and has_lab or (not has_lab and year_level >= 2):
                phase = SchedulingPhase.PHASE_2_REGULAR
            # Phase 3: Critical courses (4th year, labs, multiple blocks) - HARDEST
            else:
                phase = SchedulingPhase.PHASE_3_CRITICAL
            
            scored_courses.append((phase, priority_score, course))
        
        # Sort by phase first, then priority score
        scored_courses.sort(key=lambda x: (x[0].value, -x[1]))
        
        return [(phase, course) for phase, _, course in scored_courses]
    
    def setup_time_parameters(self):
        """Setup time discretization parameters"""
        self.start_t = self.time_settings["start_time"]
        self.end_t = self.time_settings["end_time"]
        self.inc_hr = 2
        self.inc_day = (self.end_t - self.start_t) * self.inc_hr
        self.total_inc = self.inc_day * len(self.days)
        
        self.lab_starts = []
        for d in range(len(self.days)):
            base = d * self.inc_day
            self.lab_starts.extend(range(base, base + self.inc_day - 2))
    
    def get_available_time_slots(self, section_key, duration, is_lab=False, max_slots=1000):
        """
        Get available time slots that don't conflict with existing schedule.
        Returns list of valid start times, limited to max_slots for solver efficiency.
        """
        occupied = self.section_occupied.get(section_key, set())
        available_starts = []
        
        search_space = self.lab_starts if is_lab else range(self.total_inc - duration + 1)
        
        for start in search_space:
            # Check if all required slots are free
            slots_needed = set(range(start, start + duration))
            if not slots_needed.intersection(occupied):
                available_starts.append(start)
                # Limit domain size for solver efficiency
                if len(available_starts) >= max_slots:
                    break
        
        return available_starts
    
    def get_available_rooms(self, room_type, start, duration):
        """
        Get list of rooms available for the given time slot.
        Returns list of room indices.
        """
        available = []
        slots_needed = set(range(start, start + duration))
        
        for room_idx in range(len(self.rooms[room_type])):
            occupied = self.occupied_slots.get((room_type, room_idx), set())
            if not slots_needed.intersection(occupied):
                available.append(room_idx)
        
        return available
    
    def get_phase_timeout(self, phase_num, total_phases, phase_difficulty):
        """
        Calculate timeout for phase based on phase difficulty.
        Easy phases get less time, hard phases get more time.
        """
        base_times = [150, 200, 700]  # Slightly increased for more constraints
        
        if phase_num <= len(base_times):
            timeout = base_times[phase_num - 1]
        else:
            timeout = 300
        
        # Adjust by difficulty multiplier
        return int(timeout * phase_difficulty)
    
    def calculate_phase_difficulty(self, phase_courses):
        """Estimate phase difficulty (0.5 to 2.0)"""
        if not phase_courses:
            return 0.5
        
        total_units = sum(
            c.get('unitsLecture', 0) + c.get('unitsLab', 0) * 2
            for c in phase_courses
        )
        total_blocks = sum(c.get('blocks', 1) for c in phase_courses)
        
        avg_units = total_units / len(phase_courses)
        avg_blocks = total_blocks / len(phase_courses)
        
        # Harder phases have more units and blocks
        difficulty = (avg_units / 5.0) * (avg_blocks / 1.5)
        return max(0.5, min(2.0, difficulty))
    
    def solve_phase(self, phase_courses, phase_num, total_phases):
        """
        Solve scheduling for a single phase of courses.
        Uses feasibility-first approach with soft objectives.
        """
        if not phase_courses:
            return []
        
        phase_difficulty = self.calculate_phase_difficulty(phase_courses)
        timeout = self.get_phase_timeout(phase_num, total_phases, phase_difficulty)
        
        logger.info(f"Phase {phase_num}/{total_phases}: Processing {len(phase_courses)} courses (difficulty: {phase_difficulty:.2f}, timeout: {timeout}s)")
        
        # Attempt 1: Strict feasibility (hard constraints only, no objectives)
        result = self._solve_phase_attempt(phase_courses, phase_num, total_phases, timeout, optimize=False)
        
        if result is not None:
            logger.info(f"Phase {phase_num} completed (feasibility mode)")
            return result
        
        # Attempt 2: Relaxed feasibility (soft objectives enabled, longer timeout)
        logger.warning(f"Phase {phase_num} feasibility failed, retrying with objectives...")
        result = self._solve_phase_attempt(phase_courses, phase_num, total_phases, int(timeout * 1.5), optimize=True)
        
        if result is not None:
            logger.info(f"Phase {phase_num} completed (optimization mode)")
            return result
        
        logger.error(f"Phase {phase_num} failed completely")
        return None
    
    def _solve_phase_attempt(self, phase_courses, phase_num, total_phases, timeout, optimize=True):
        """Internal method to attempt solving a phase"""
        model = cp_model.CpModel()
        solver = cp_model.CpSolver()
        
        phase_sessions = []
        section_intervals = defaultdict(list)
        room_intervals = defaultdict(list)
        
        # Add prior fixed intervals from global_schedule to enforce inter-phase no-overlaps
        prior_count = 0
        for event in self.global_schedule:
            rt = event['_room_type']
            if rt not in self.rooms:
                continue  # Skip invalid types
            ri = event['_room_idx']
            ss = event['_start_slot']
            dd = event['_duration']
            fixed_end = ss + dd
            fixed_iv = model.NewIntervalVar(ss, dd, fixed_end, f"prior_fixed_{event['schedule_id']}")
            room_intervals[(rt, ri)].append(fixed_iv)
            prior_count += 1
        if prior_count > 0:
            logger.info(f"Added {prior_count} prior fixed intervals for room constraints")
        
        course_progress_start = 50 + (phase_num - 1) * 40 // total_phases
        course_progress_end = 50 + phase_num * 40 // total_phases
        
        # Process each course in this phase
        for idx, course in enumerate(phase_courses):
            sessions = self.create_course_sessions(
                model, course, section_intervals, room_intervals
            )
            if sessions is None:
                return None  # Critical failure
            
            phase_sessions.extend(sessions)
            
            progress = course_progress_start + int((idx + 1) / len(phase_courses) * (course_progress_end - course_progress_start))
            self.update_progress(progress)
        
        # Add hard constraints (no-overlap)
        for intervals in section_intervals.values():
            if intervals:
                model.AddNoOverlap(intervals)
        
        for intervals in room_intervals.values():
            if intervals:
                model.AddNoOverlap(intervals)
        
        # Add same-room constraint for course sessions
        self.add_room_consistency(model, phase_sessions)
        
        # Add soft objectives only if optimize=True
        if optimize:
            self.add_phase_objectives(model, phase_sessions)
        
        # Configure solver
        solver.parameters.max_time_in_seconds = timeout
        solver.parameters.num_search_workers = 12  # Increased for better parallelism
        solver.parameters.log_search_progress = True
        solver.parameters.linearization_level = 2  # Better for optional + fixed intervals
        # More aggressive search for harder phases
        if phase_num == total_phases:
            solver.parameters.use_absl_random = True
            solver.parameters.random_seed = random.randint(0, 1000000)
            solver.parameters.cp_model_probing_level = 2  # Enhanced probing
        
        status = solver.Solve(model)
        
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return None
        
        # Extract and record solution
        phase_schedule = self.extract_phase_solution(solver, phase_sessions)
        self.update_occupancy_from_schedule(phase_schedule)
        
        logger.info(f"Phase {phase_num} completed: {len(phase_schedule)} sessions scheduled")
        return phase_schedule
    
    def create_course_sessions(self, model, course, section_intervals, room_intervals):
        """Create variables and constraints for one course"""
        code = course["courseCode"]
        title = course["title"]
        prog = course["program"]
        yr = course["yearLevel"]
        lec_u = course["unitsLecture"]
        lab_u = course["unitsLab"]
        blocks = course.get("blocks", 1)
        
        all_sessions = []
        
        for b in range(blocks):
            blk = chr(ord('A') + b)
            section_key = (prog, yr, blk)
            
            # Process lectures
            if lec_u > 0:
                sessions = self.create_session_type(
                    model, code, prog, yr, blk, 'lecture', lec_u, 2, title,
                    section_key, section_intervals, room_intervals, is_lab=False
                )
                if sessions is None:
                    return None
                all_sessions.extend(sessions)
            
            # Process labs
            if lab_u > 0:
                sessions = self.create_session_type(
                    model, code, prog, yr, blk, 'lab', lab_u * 2, 3, title,
                    section_key, section_intervals, room_intervals, is_lab=True
                )
                if sessions is None:
                    return None
                all_sessions.extend(sessions)
        
        return all_sessions
    
    def create_session_type(self, model, code, prog, yr, blk, sess_type, 
                           units, duration, title, section_key,
                           section_intervals, room_intervals, is_lab=False):
        """Create variables for sessions of one type (lecture or lab)"""
        sessions = []
        day_vars = []
        start_vars = []
        
        # Get available time slots - aggressive domain limiting
        available_starts = self.get_available_time_slots(section_key, duration, is_lab, max_slots=1000)
        
        if not available_starts:
            logger.warning(f"No available slots for {code} {sess_type} block {blk}")
            # Fallback: use all possible slots (may be infeasible, but let solver decide)
            available_starts = self.lab_starts if is_lab else list(range(self.total_inc - duration + 1))
            if not available_starts:
                return None
        
        num_rooms = len(self.rooms[sess_type])
        # Always enforce for small num_rooms like 10
        enforce_room_constraints = True
        logger.info(f"Enforcing room constraints for {sess_type}: {num_rooms} rooms")
        
        for i in range(units):
            # Start time variable - constrained to available slots
            domain_values = available_starts[:min(len(available_starts), 200)]  # Hard limit to 200
            if not domain_values:
                return None
            
            s = model.NewIntVarFromDomain(
                cp_model.Domain.FromValues(domain_values),
                f"{code}_{sess_type}_{blk}_{i}_s"
            )
            
            # End time
            e = model.NewIntVar(duration, self.total_inc, f"{code}_{sess_type}_{blk}_{i}_e")
            model.Add(e == s + duration)
            
            # Day variable
            dvar = model.NewIntVar(0, len(self.days) - 1, f"{code}_{sess_type}_{blk}_{i}_d")
            model.Add(s >= dvar * self.inc_day)
            model.Add(s < (dvar + 1) * self.inc_day)
            
            # Room variable - full domain; constraints handle availability
            rv = model.NewIntVar(0, num_rooms - 1, f"{code}_{sess_type}_{blk}_{i}_room")
            
            # Interval for section conflicts
            iv = model.NewIntervalVar(s, duration, e, f"iv_{self.schedule_id}")
            section_intervals[section_key].append(iv)
            
            # Optional intervals for room conflicts
            if enforce_room_constraints:
                for r_idx in range(num_rooms):
                    lit = model.NewBoolVar(f"use_{self.schedule_id}_room_{r_idx}")
                    model.Add(rv == r_idx).OnlyEnforceIf(lit)
                    model.Add(rv != r_idx).OnlyEnforceIf(lit.Not())
                    
                    opt_iv = model.NewOptionalIntervalVar(
                        s, duration, e, lit, f"opt_iv_{self.schedule_id}_{r_idx}"
                    )
                    room_intervals[(sess_type, r_idx)].append(opt_iv)
            
            sessions.append({
                'id': self.schedule_id,
                'code': code,
                'title': title,
                'prog': prog,
                'yr': yr,
                'blk': blk,
                'type': sess_type,
                'start': s,
                'end': e,
                'room': rv,
                'day': dvar,
                'duration': duration
            })
            
            day_vars.append(dvar)
            start_vars.append(s)
            self.schedule_id += 1
        
        # Add block-level constraints
        if len(day_vars) > 1:
            self.add_block_day_constraints(model, day_vars, code, blk, is_lab)
        
        return sessions
    
    def add_block_day_constraints(self, model, day_vars, code, blk, is_lab):
        """Enforce per-day session limits"""
        max_per_day = 2 if is_lab else 1
        
        for d in range(len(self.days)):
            day_bools = []
            for i, dv in enumerate(day_vars):
                b = model.NewBoolVar(f"{code}_{blk}_day{d}_sess{i}")
                model.Add(dv == d).OnlyEnforceIf(b)
                model.Add(dv != d).OnlyEnforceIf(b.Not())
                day_bools.append(b)
            
            model.Add(sum(day_bools) <= max_per_day)
    
    def add_room_consistency(self, model, sessions):
        """Ensure all sessions of same course use same room"""
        by_course = defaultdict(list)
        for sess in sessions:
            key = (sess['code'], sess['prog'], sess['yr'], sess['blk'], sess['type'])
            by_course[key].append(sess['room'])
        
        for room_vars in by_course.values():
            if len(room_vars) > 1:
                for v in room_vars[1:]:
                    model.Add(v == room_vars[0])
    
    def add_phase_objectives(self, model, sessions):
        """Add soft optimization objectives for this phase"""
        objectives = []
        
        # Minimize day spreading per program/year (soft constraint)
        program_year_days = defaultdict(list)
        for sess in sessions:
            program_year_days[(sess['prog'], sess['yr'])].append(sess['day'])
        
        for days in program_year_days.values():
            if len(days) > 1:
                min_day = model.NewIntVar(0, len(self.days) - 1, "min_day")
                max_day = model.NewIntVar(0, len(self.days) - 1, "max_day")
                model.AddMinEquality(min_day, days)
                model.AddMaxEquality(max_day, days)
                day_span = model.NewIntVar(0, len(self.days) - 1, "day_span")
                model.Add(day_span == max_day - min_day)
                objectives.append(day_span)
        
        # Soft penalty for early/late times (scaled down to not dominate)
        for idx, sess in enumerate(sessions):
            time_in_day = model.NewIntVar(0, self.inc_day, f"time_{idx}")
            model.AddModuloEquality(time_in_day, sess['start'], self.inc_day)
            
            is_early = model.NewBoolVar(f"early_{idx}")
            is_late = model.NewBoolVar(f"late_{idx}")
            
            model.Add(time_in_day < 2).OnlyEnforceIf(is_early)
            model.Add(time_in_day >= 2).OnlyEnforceIf(is_early.Not())
            
            model.Add(time_in_day > self.inc_day - 6).OnlyEnforceIf(is_late)
            model.Add(time_in_day <= self.inc_day - 6).OnlyEnforceIf(is_late.Not())
            
            early_penalty = model.NewIntVar(0, 1, f"early_pen_{idx}")
            late_penalty = model.NewIntVar(0, 1, f"late_pen_{idx}")
            
            model.Add(early_penalty == 1).OnlyEnforceIf(is_early)
            model.Add(early_penalty == 0).OnlyEnforceIf(is_early.Not())
            model.Add(late_penalty == 1).OnlyEnforceIf(is_late)
            model.Add(late_penalty == 0).OnlyEnforceIf(is_late.Not())
            
            objectives.extend([early_penalty, late_penalty])
        
        if objectives:
            model.Minimize(sum(objectives))
    
    def extract_phase_solution(self, solver, sessions):
        """Extract solution for this phase"""
        schedule = []
        
        for sess in sessions:
            room_idx = solver.Value(sess['room'])
            day_idx = solver.Value(sess['day'])
            start_val = solver.Value(sess['start'])
            
            # Calculate time strings
            offs = start_val % self.inc_day
            hr = self.start_t + offs / self.inc_hr
            m1 = int((hr - int(hr)) * 60)
            t1 = f"{int(hr)%12 or 12}:{m1:02d} {'AM' if hr<12 else 'PM'}"
            
            hr2 = hr + sess['duration'] / self.inc_hr
            m2 = int((hr2 - int(hr2)) * 60)
            t2 = f"{int(hr2)%12 or 12}:{m2:02d} {'AM' if hr2<12 else 'PM'}"
            
            # Only add suffix if course has both lecture and lab units
            if sess['code'] in self.courses_with_both:
                display_code = f"{sess['code']}A" if sess['type'] == 'lecture' else f"{sess['code']}L"
            else:
                display_code = sess['code']
            
            schedule.append({
                'schedule_id': sess['id'],
                'courseCode': display_code,
                'baseCourseCode': sess['code'],
                'title': sess['title'],
                'program': sess['prog'],
                'year': sess['yr'],
                'session': 'Lecture' if sess['type'] == 'lecture' else 'Laboratory',
                'block': sess['blk'],
                'day': self.days[day_idx],
                'period': f"{t1} - {t2}",
                'room': self.rooms[sess['type']][room_idx],
                '_start_slot': start_val,
                '_duration': sess['duration'],
                '_room_type': sess['type'],
                '_room_idx': room_idx
            })
        
        return schedule
    
    def update_occupancy_from_schedule(self, schedule):
        """Update global occupancy tracking with newly scheduled sessions"""
        for event in schedule:
            section_key = (event['program'], event['year'], event['block'])
            room_key = (event['_room_type'], event['_room_idx'])
            
            start_slot = event['_start_slot']
            duration = event['_duration']
            slots = set(range(start_slot, start_slot + duration))
            
            self.section_occupied[section_key].update(slots)
            self.occupied_slots[room_key].update(slots)
    
    def solve(self):
        """Main solving method using hierarchical approach"""
        self.update_progress(52)
        
        # Partition courses by phase
        phases = defaultdict(list)
        for phase, course in self.all_courses:
            phases[phase].append(course)
        
        total_phases = len(phases)
        combined_schedule = []
        
        # Solve each phase sequentially (now in order: easy to hard)
        for phase_num, phase in enumerate(sorted(phases.keys(), key=lambda p: p.value), 1):
            phase_courses = phases[phase]
            
            phase_schedule = self.solve_phase(phase_courses, phase_num, total_phases)
            
            if phase_schedule is None:
                logger.error(f"Failed to schedule phase {phase_num}")
                self.update_progress(-1)
                return "impossible"
            
            combined_schedule.extend(phase_schedule)
            self.global_schedule = combined_schedule[:]  # Update cumulative for next phases
        
        # Sort final schedule
        combined_schedule.sort(key=lambda x: (
            self.days.index(x['day']),
            x['_start_slot']
        ))
        
        # Clean up internal fields
        for event in combined_schedule:
            del event['_start_slot']
            del event['_duration']
            del event['_room_type']
            del event['_room_idx']
        
        self.update_progress(95)
        return combined_schedule


def generate_schedule(process_id=None):
    """Main entry point for schedule generation"""
    try:
        scheduler = HierarchicalScheduler(process_id)
        
        scheduler.load_data()
        schedule = scheduler.solve()
        
        if schedule == "impossible":
            logger.error("Schedule generation resulted in impossible configuration")
            return "impossible"
        
        schedule_dict.clear()
        schedule_dict.update({e['schedule_id']: e for e in schedule})
        
        if process_id:
            progress_state[process_id] = 100
        
        logger.info(f"Successfully generated schedule with {len(schedule)} events")
        return schedule
        
    except Exception as e:
        logger.exception(f"Error in schedule generation: {str(e)}")
        if process_id:
            progress_state[process_id] = -1
        return "impossible"