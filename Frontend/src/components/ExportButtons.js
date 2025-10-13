import React from 'react';
import { computeEventUnits } from '../utils/scheduleHelpers';
import leftLogo from '../assets/GClogo.png';
import rightLogo from '../assets/CSSlogo.png';

const ExportButtons = ({ events, faculty, scheduleName, filterInfo }) => {
  const assignedUnits = events.reduce((acc, event) => acc + computeEventUnits(event), 0);

  
  const formatFilterInfo = (filterInfo) => {
    if (!filterInfo) return '';
    
    
    if (typeof filterInfo === 'string') {
      
      const programMatch = filterInfo.match(/(BSIT|BSCS|BSEMC)/);
      const yearMatch = filterInfo.match(/Year(\d+)/);
      const blockMatch = filterInfo.match(/Block\s+([A-F])/);
      const courseMatch = filterInfo.match(/Course:\s+(.+?)(?:\s+|$)/);
      
      const parts = [];
      
      
      if (programMatch) {
        const programMap = {
          'BSIT': 'BS in Information Technology',
          'BSCS': 'BS in Computer Science',
          'BSEMC': 'BS in Entertainment and Multimedia Computing'
        };
        parts.push(programMap[programMatch[1]] || programMatch[1]);
      }
      
      
      if (yearMatch) {
        const year = yearMatch[1];
        const getOrdinalSuffix = (num) => {
          const n = parseInt(num);
          if (n === 1) return 'st';
          if (n === 2) return 'nd';
          if (n === 3) return 'rd';
          return 'th';
        };
        parts.push(`${year}${getOrdinalSuffix(year)} Year`);
      }
      
      
      if (blockMatch) {
        parts.push(`Block ${blockMatch[1]}`);
      }
      
      
      if (courseMatch) {
        parts.push(`Course: ${courseMatch[1]}`);
      }
      
      return parts.length > 0 ? parts.join(' • ') : filterInfo;
    }
    
    
    if (typeof filterInfo === 'object') {
      const parts = [];
      
     
      if (filterInfo.program && filterInfo.program !== 'all') {
        const programMap = {
          'BSIT': 'BS in Information Technology',
          'BSCS': 'BS in Computer Science',
          'BSEMC': 'BS in Entertainment and Multimedia Computing'
        };
        parts.push(programMap[filterInfo.program] || filterInfo.program);
      }
      
      
      if (filterInfo.year && filterInfo.year !== 'all') {
        const getOrdinalSuffix = (num) => {
          const n = parseInt(num);
          if (n === 1) return 'st';
          if (n === 2) return 'nd';
          if (n === 3) return 'rd';
          return 'th';
        };
        parts.push(`${filterInfo.year}${getOrdinalSuffix(filterInfo.year)} Year`);
      }
      
      
      if (filterInfo.block && filterInfo.block !== 'all') {
        parts.push(`Block ${filterInfo.block}`);
      }
      
      
      if (filterInfo.courseQuery && filterInfo.courseQuery.trim()) {
        parts.push(`Course: ${filterInfo.courseQuery.trim()}`);
      }
      
      return parts.join(' • ');
    }
    
    return '';
  };

  const extractScheduleInfo = (name) => {
    
    let semester = '';
    let academicYear = '';
    
    if (!name) return { semester, academicYear };
  
    
    const p1 = /(\d{4}-\d{4})\s+(\d)(?:st|nd|rd|th)?\s*sem/i;
    let m = name.match(p1);
    if (m) {
      const num = m[2];
      const suffix = num === '1' ? 'st' :
                     num === '2' ? 'nd' :
                     num === '3' ? 'rd' : 'th';
      return { semester: `${num}${suffix}`, academicYear: m[1] };
    }
  
    
    const p2 = /(\d{4}-\d{4})\s+Midyear/i;
    m = name.match(p2);
    if (m) {
      return { semester: 'Midyear', academicYear: m[1] };
    }
    
    
    return { semester, academicYear };
  };
  
  const getDataUrl = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const loadImage = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(getDataUrl(img));
      img.onerror = reject;
      img.src = src;
    });

  const exportToPDF = async () => {
    if (!faculty) return;
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return alert('jsPDF not available');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const { semester, academicYear } = extractScheduleInfo(scheduleName);
    const w = doc.internal.pageSize.getWidth();
    const m = 12;

    try {
      const [leftData, rightData] = await Promise.all([loadImage(leftLogo), loadImage(rightLogo)]);
      doc.addImage(leftData, 'PNG', m, m, 30, 30);
      doc.addImage(rightData, 'PNG', w - m - 30, m, 30, 30);
    } catch (e) {
      console.warn('Logo load failed', e);
    }

    doc.setFont('helvetica', 'bold').setFontSize(12)
      .text('City of Olongapo', w / 2, m + 6, { align: 'center' })
      .setFont('helvetica', 'bold').setFontSize(14)
      .text('GORDON COLLEGE', w / 2, m + 13, { align: 'center' })
      .setFont('helvetica', 'bold').setFontSize(12)
      .text('College of Computer Studies', w / 2, m + 19, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(9)
      .text('Olongapo City Sports Complex, East Tapinac, Olongapo City', w / 2, m + 26, { align: 'center' })
      .text('Tel. No. (047) 224-2089 loc. 314', w / 2, m + 31, { align: 'center' })
      .text('www.gordoncollege.edu.ph', w / 2, m + 36, { align: 'center' });
    doc.setDrawColor(0).setLineWidth(0.4)
      .line(m, m + 40, w - m, m + 40);

    
    let y = m + 48;
    doc.setFont('helvetica', 'bold').setFontSize(16)
      .text('INDIVIDUAL FACULTY LOAD AND SCHEDULE', w / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'normal').setFontSize(11)
      .text(`Semester: ${semester} | AY: ${academicYear}`, w / 2, y + 7, { align: 'center' });

    
    y += 15;
    const infoX = m;
    const gap = 30;
    doc.setFont('helvetica', 'bold').setFontSize(10);
    ['Name:', 'Sex:', 'Specialization:', 'Status:', 'Education:', 'Rank:', 'Department:'].forEach((label, idx) => {
      const colX = infoX + (idx % 2) * 90;
      const rowY = y + Math.floor(idx / 2) * 6;
      doc.text(label, colX, rowY);
      doc.setFont('helvetica', 'normal')
        .text([faculty.name, faculty.Sex, faculty.specialization, faculty.Status, faculty.Educational_attainment, faculty.AcademicRank, faculty.Department][idx] || 'N/A', colX + gap, rowY)
        .setFont('helvetica', 'bold');
    });

    
    y += 14;
    doc.setFont('helvetica', 'bold').setFontSize(11)
      .text('Designation and Other Assignments:', m, y + 12);
    
    
    const formattedFilterInfo = formatFilterInfo(filterInfo);
    if (formattedFilterInfo) {
      doc.setFont('helvetica', 'normal').setFontSize(10)
        .text(`${formattedFilterInfo}`, m, y + 16.5);
      y += 6; 
    }
    
    
    y += 13.5;
    const tableW = w - 2 * m;
    doc.autoTable({
      head: [['Course Code','Course Title','Session','Program','Year','Block','Day','Time','Room','Units']],
      body: events.map(ev => [
        ev.courseCode, ev.title, ev.session, ev.program,
        ev.year, ev.block, ev.day, ev.period, ev.room,
        computeEventUnits(ev)
      ]),
      foot: [[ '', '', '', '', '', '', '', '', 'Total Units:', assignedUnits ]],
      startY: y,
      theme: 'grid',
      styles: { fontSize: 9, textColor: [0,0,0], cellPadding: 1.2, lineColor: [0,0,0], lineWidth: 0.15 },
      tableWidth: tableW,
      margin: { left: m, right: m },
      headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
      footStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', halign: 'left' }
    });

    doc.save(`Faculty_Schedule_${faculty.name}_${semester}_${academicYear.replace('-', '_')}.pdf`);
  };

  
  const exportToExcel = () => {
    if (!faculty) return;
    const { semester, academicYear } = extractScheduleInfo(scheduleName);
    const info = [
      [`Name: ${faculty.name}`, `Sex: ${faculty.Sex}`],
      [`Specialization: ${faculty.specialization}`, `Status: ${faculty.Status}`],
      [`Education: ${faculty.Educational_attainment}`, `Rank: ${faculty.AcademicRank}`],
      [`Department: ${faculty.Department}`], [],
      [`Designations:`]
    ];
    
    
    const formattedFilterInfo = formatFilterInfo(filterInfo);
    if (formattedFilterInfo) {
      info.push([`Class Schedule Filter: ${formattedFilterInfo}`]);
    }
    
    const tblHead = ['Course Code','Course Title','Session','Program','Year','Block','Day','Time','Room','Units'];
    const rows = events.map(ev => [
      ev.courseCode, ev.title, ev.session, ev.program,
      ev.year, ev.block, ev.day, ev.period, ev.room,
      computeEventUnits(ev)
    ]);
    rows.push([]);
    rows.push(['','','','','','','','Total', '', assignedUnits]);

    const wsData = [...info, [], tblHead, ...rows];
    const wb = window.XLSX.utils.book_new();
    const ws = window.XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch:15 },{ wch:30 },{ wch:10 },{ wch:15 },{ wch:5 },
      { wch:5 },{ wch:8 },{ wch:15 },{ wch:10 },{ wch:7 }
    ];
    if (ws.A1) ws.A1.s = { font:{ bold:true, sz:14 }, alignment:{ horizontal:'center' } };
    window.XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
    window.XLSX.writeFile(wb, `Faculty_Schedule_${faculty.name}_${semester}_${academicYear.replace('-', '_')}.xlsx`);
  };

  return (
    <div className="export-buttons flex space-x-2">
      <button onClick={exportToExcel} className="excel-btn px-4 py-2 rounded shadow">
        <i className="fa fa-file-excel-o mr-1" /> Export to Excel
      </button>
      <button onClick={exportToPDF} className="pdf-btn px-4 py-2 rounded shadow">
        <i className="fa fa-file-pdf-o mr-1" /> Export to PDF
      </button>
    </div>
  );
};

export default ExportButtons;