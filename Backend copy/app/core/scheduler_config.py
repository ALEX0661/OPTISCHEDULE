"""
Configuration for hierarchical scheduler.
Adjust these parameters to tune performance and quality.
"""

class SchedulerConfig:
    """Configuration for the hierarchical scheduler"""
    
    # Phase configuration
    PHASE_1_MAX_TIME_SECONDS = 400  # Critical courses get more time
    PHASE_2_MAX_TIME_SECONDS = 300
    PHASE_3_MAX_TIME_SECONDS = 200
    
    # Search configuration
    NUM_SEARCH_WORKERS = 8  # Adjust based on CPU cores
    ENABLE_SEARCH_PROGRESS_LOG = True
    
    # Domain size limits (prevents model explosion)
    MAX_DOMAIN_SIZE_PER_VARIABLE = 1000  # Limit available time slots per variable
    
    # Course partitioning thresholds
    CRITICAL_YEAR_THRESHOLD = 4  # Year level to consider critical
    
    # Optimization weights
    EARLY_TIME_PENALTY = 2  # Penalty for classes before 8am
    LATE_TIME_PENALTY = 2   # Penalty for classes after 6pm
    DAY_SPREAD_WEIGHT = 1   # Weight for minimizing day spread
    
    # Constraint relaxation (emergency fallback)
    ALLOW_CONSTRAINT_RELAXATION = False
    MAX_OVERLAP_MINUTES = 0  # Allow slight overlap if needed (0 = strict)
    
    # Memory optimization
    BATCH_CONSTRAINT_ADDITION = True  # Add constraints in batches
    USE_SYMMETRY_BREAKING = True      # Enable symmetry breaking
    
    # Retry configuration
    MAX_PHASE_RETRIES = 2  # Retry failed phases
    USE_RANDOM_RESTART = True  # Use different random seeds on retry
    
    @classmethod
    def get_phase_time_limit(cls, phase_num: int) -> int:
        """Get time limit for specific phase"""
        if phase_num == 1:
            return cls.PHASE_1_MAX_TIME_SECONDS
        elif phase_num == 2:
            return cls.PHASE_2_MAX_TIME_SECONDS
        else:
            return cls.PHASE_3_MAX_TIME_SECONDS
    
    @classmethod
    def should_use_domain_filtering(cls, available_slots: int) -> bool:
        """Determine if domain filtering should be applied"""
        return available_slots > cls.MAX_DOMAIN_SIZE_PER_VARIABLE
    
    @classmethod
    def get_filtered_domain(cls, available_slots: list) -> list:
        """
        Filter large domains to manageable size while maintaining diversity.
        Uses stratified sampling to keep representation across time periods.
        """
        if len(available_slots) <= cls.MAX_DOMAIN_SIZE_PER_VARIABLE:
            return available_slots
        
        # Stratified sampling: divide into buckets and sample from each
        step = len(available_slots) // cls.MAX_DOMAIN_SIZE_PER_VARIABLE
        return [available_slots[i] for i in range(0, len(available_slots), step)]


class PerformanceMonitor:
    """Monitor and log performance metrics"""
    
    def __init__(self):
        self.phase_times = {}
        self.phase_variable_counts = {}
        self.phase_constraint_counts = {}
        
    def record_phase_start(self, phase_num: int, num_courses: int, 
                          num_variables: int, num_constraints: int):
        """Record start of phase"""
        import time
        self.phase_times[phase_num] = {
            'start': time.time(),
            'courses': num_courses,
            'variables': num_variables,
            'constraints': num_constraints
        }
    
    def record_phase_end(self, phase_num: int, success: bool, num_sessions: int):
        """Record end of phase"""
        import time
        if phase_num in self.phase_times:
            self.phase_times[phase_num]['end'] = time.time()
            self.phase_times[phase_num]['duration'] = (
                self.phase_times[phase_num]['end'] - 
                self.phase_times[phase_num]['start']
            )
            self.phase_times[phase_num]['success'] = success
            self.phase_times[phase_num]['sessions'] = num_sessions
    
    def get_report(self) -> str:
        """Generate performance report"""
        lines = ["=" * 60, "Scheduler Performance Report", "=" * 60]
        
        total_time = 0
        total_courses = 0
        total_sessions = 0
        
        for phase_num in sorted(self.phase_times.keys()):
            data = self.phase_times[phase_num]
            duration = data.get('duration', 0)
            total_time += duration
            total_courses += data.get('courses', 0)
            total_sessions += data.get('sessions', 0)
            
            lines.append(f"\nPhase {phase_num}:")
            lines.append(f"  Courses: {data.get('courses', 0)}")
            lines.append(f"  Variables: {data.get('variables', 0)}")
            lines.append(f"  Constraints: {data.get('constraints', 0)}")
            lines.append(f"  Duration: {duration:.2f}s")
            lines.append(f"  Sessions: {data.get('sessions', 0)}")
            lines.append(f"  Success: {data.get('success', False)}")
        
        lines.append(f"\nTotal:")
        lines.append(f"  Courses: {total_courses}")
        lines.append(f"  Sessions: {total_sessions}")
        lines.append(f"  Total Time: {total_time:.2f}s")
        lines.append("=" * 60)
        
        return "\n".join(lines)


class SchedulingStrategy:
    """Different scheduling strategies that can be applied"""
    
    @staticmethod
    def greedy_time_slot_selection(available_slots: list, 
                                   prefer_midday: bool = True) -> list:
        """
        Order time slots by preference (e.g., prefer midday slots).
        Returns ordered list of slots.
        """
        if not prefer_midday or len(available_slots) < 10:
            return available_slots
        
        # Sort slots by distance from midday
        # This heuristic helps group classes in reasonable time blocks
        midpoint = len(available_slots) // 2
        return sorted(available_slots, 
                     key=lambda s: abs(s - available_slots[midpoint]))
    
    @staticmethod
    def room_affinity_scoring(course_code: str, room_type: str, 
                             room_name: str) -> float:
        """
        Score room affinity for a course.
        Higher score = better match.
        """
        score = 1.0
        
        # Lab courses prefer lab rooms
        if 'lab' in course_code.lower() and room_type == 'lab':
            score += 0.5
        
        # Check for program-specific room preferences
        # (can be extended with actual data)
        
        return score
    
    @staticmethod
    def balance_daily_load(day_assignments: dict) -> list:
        """
        Suggest day preferences to balance load across week.
        Returns list of (day_idx, preference_score) tuples.
        """
        # Count current assignments per day
        day_counts = {day: len(assignments) 
                     for day, assignments in day_assignments.items()}
        
        # Prefer days with fewer assignments
        min_count = min(day_counts.values()) if day_counts else 0
        
        preferences = []
        for day, count in day_counts.items():
            # Lower count = higher preference
            pref_score = (min_count + 1) / (count + 1)
            preferences.append((day, pref_score))
        
        return sorted(preferences, key=lambda x: x[1], reverse=True)
