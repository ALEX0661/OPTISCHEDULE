// exportUtils.js
import leftLogo from '../assets/GClogo.png';
import rightLogo from '../assets/CSSlogo.png';

/**
 * Extract semester and academic year from schedule name
 * @param {string} name - Schedule name
 * @returns {Object} - Object containing semester and academicYear
 */
export const extractScheduleInfo = (name) => {
  // defaults
  let semester = '';
  let academicYear = '';
  
  if (!name) return { semester, academicYear };

  // "2025-2026 1st sem"
  const p1 = /(\d{4}-\d{4})\s+(\d)(?:st|nd|rd|th)?\s*sem/i;
  let m = name.match(p1);
  if (m) {
    const num = m[2];
    const suffix = num === '1' ? 'st' :
                  num === '2' ? 'nd' :
                  num === '3' ? 'rd' : 'th';
    return { semester: `${num}${suffix}`, academicYear: m[1] };
  }

  // "2026-2027 Midyear"
  const p2 = /(\d{4}-\d{4})\s+Midyear/i;
  m = name.match(p2);
  if (m) {
    return { semester: 'Midyear', academicYear: m[1] };
  }
  
  // fallback
  return { semester, academicYear };
};

/**
 * Format filter information to be more readable
 * @param {Object|string} filterInfo - Filter information
 * @returns {string} - Formatted filter string
 */
export const formatFilterInfo = (filterInfo) => {
  if (!filterInfo) return '';
  
  // If filterInfo is already a string, let's parse and reformat it
  if (typeof filterInfo === 'string') {
    // Try to parse the existing string format
    // Example: "BSCS Year2 Block B"
    const programMatch = filterInfo.match(/(BSIT|BSCS||BSEMC-DAT|BSEMC-GD)/);
    const yearMatch = filterInfo.match(/Year(\d+)/);
    const blockMatch = filterInfo.match(/Block\s+([A-F])/);
    const courseMatch = filterInfo.match(/Course:\s+(.+?)(?:\s+|$)/);
    
    const parts = [];
    
    // Program mapping
    if (programMatch) {
      const programMap = {
        'BSIT': 'BS in Information Technology',
        'BSCS': 'BS in Computer Science',
        'BSEMC-DAT': 'BS Entertainment and Multimedia Computing - Major in Digital Animation Technology',
        'BSEMC-GD': 'BS Entertainment and Multimedia Computing - Major in Game Development'
      };
      parts.push(programMap[programMatch[1]] || programMatch[1]);
    }
    
    // Year with ordinal suffix
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
    
    // Block
    if (blockMatch) {
      parts.push(`Block ${blockMatch[1]}`);
    }
    
    // Course query
    if (courseMatch) {
      parts.push(`Course: ${courseMatch[1]}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : filterInfo;
  }
  
  // Convert filterInfo from object format to readable string
  if (typeof filterInfo === 'object') {
    const parts = [];
    
    // Format program names
    if (filterInfo.program && filterInfo.program !== 'all') {
      const programMap = {
        'BSIT': 'BS in Information Technology',
        'BSCS': 'BS in Computer Science',
        'BSEMC-DAT': 'BS Entertainment and Multimedia Computing - Major in Digital Animation Technology',
        'BSEMC-GD': 'BS Entertainment and Multimedia Computing - Major in Game Development'
      };
      parts.push(programMap[filterInfo.program] || filterInfo.program);
    }
    
    // Format year with ordinal suffix
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
    
    // Format block
    if (filterInfo.block && filterInfo.block !== 'all') {
      parts.push(`Block ${filterInfo.block}`);
    }
    
    // Add course query if present
    if (filterInfo.courseQuery && filterInfo.courseQuery.trim()) {
      parts.push(`Course: ${filterInfo.courseQuery.trim()}`);
    }
    
    return parts.join(' • ');
  }
  
  return '';
};

/**
 * Helper for getting data URL from image
 */
const getDataUrl = (img) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Helper for loading image as data URL
 */
const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(getDataUrl(img));
    img.onerror = reject;
    img.src = src;
  });

/**
 * Export schedule data to PDF with headers and styling
 * @param {Array} scheduleData - Array of schedule events
 * @param {string} scheduleName - Name of the schedule
 * @param {Object} filterInfo - Filter information object
 */
export const exportToPDF = async (scheduleData, scheduleName, filterInfo) => {
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

  // Header
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

  // Title
  let y = m + 48;
  doc.setFont('helvetica', 'bold').setFontSize(16)
    .text('GENERATED SCHEDULE', w / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(11)
    .text(`Semester: ${semester} | AY: ${academicYear}`, w / 2, y + 7, { align: 'center' });

  // Add formatted filter information
  y += 13;
  const formattedFilterInfo = formatFilterInfo(filterInfo);
  if (formattedFilterInfo) {
    doc.setFont('helvetica', 'normal').setFontSize(10)
      .text(`Class Schedule Filter: ${formattedFilterInfo}`, m, y);
    y += 1; // Adjust vertical position to accommodate the filter info
  }
  
  // Table
  y += 1;
  const tableW = w - 2 * m;
  doc.autoTable({
    head: [['Course Code','Course Title','Session','Program','Year','Block','Day','Time','Room','Faculty']],
    body: scheduleData.map(ev => [
      ev.courseCode, ev.title, ev.session, ev.program,
      ev.year, ev.block, ev.day, ev.period, ev.room, ev.faculty || ''
    ]),
    startY: y,
    theme: 'grid',
    styles: { fontSize: 9, textColor: [0,0,0], cellPadding: 1.2, lineColor: [0,0,0], lineWidth: 0.15 },
    tableWidth: tableW,
    margin: { left: m, right: m },
    headStyles: { fillColor: [255,255,255], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' }
  });

  const filename = `Generated_Schedule_${semester}_${academicYear.replace('-', '_')}`;
  doc.save(`${filename}.pdf`);
};

/**
 * Export schedule data to Excel with headers and styling
 * @param {Array} scheduleData - Array of schedule events
 * @param {string} scheduleName - Name of the schedule
 * @param {Object} filterInfo - Filter information object
 */
export const exportToExcel = (scheduleData, scheduleName, filterInfo) => {
  const { semester, academicYear } = extractScheduleInfo(scheduleName);
  
  // Header information
  const header = [
    [`Gordon College - College of Computer Studies`],
    [`Academic Year: ${academicYear}`, `Semester: ${semester}`],
    []
  ];
  
  // Add formatted filter information
  const formattedFilterInfo = formatFilterInfo(filterInfo);
  if (formattedFilterInfo) {
    header.push([`Class Schedule Filter: ${formattedFilterInfo}`]);
    header.push([]);
  }
  
  const tblHead = ['Course Code','Course Title','Session','Program','Year','Block','Day','Time','Room','Faculty'];
  const rows = scheduleData.map(ev => [
    ev.courseCode, ev.title, ev.session, ev.program,
    ev.year, ev.block, ev.day, ev.period, ev.room, ev.faculty || ''
  ]);

  const wsData = [...header, tblHead, ...rows];
  const wb = window.XLSX.utils.book_new();
  const ws = window.XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  ws['!cols'] = [
    { wch:15 },{ wch:30 },{ wch:10 },{ wch:15 },{ wch:5 },
    { wch:5 },{ wch:8 },{ wch:15 },{ wch:10 },{ wch:25 }
  ];
  
  // Set header styling
  if (ws.A1) ws.A1.s = { font:{ bold:true, sz:14 }, alignment:{ horizontal:'center' } };
  
  // Add worksheet to workbook
  window.XLSX.utils.book_append_sheet(wb, ws, 'Schedule');
  
  const filename = `Generated_Schedule_${semester}_${academicYear.replace('-', '_')}`;
  window.XLSX.writeFile(wb, `${filename}.xlsx`);
};