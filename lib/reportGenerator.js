/**
 * Automated Report Generation System
 * Template-based reporting with multiple export formats
 */

import { ClassStatistics, TrendAnalysis, ComparativeAnalysis } from './statisticalAnalysis'

/**
 * Report Template Engine
 * Manages report templates and data binding
 */
export class ReportTemplateEngine {
  static TEMPLATE_TYPES = {
    STUDENT_PROGRESS: 'student_progress',
    CLASS_PERFORMANCE: 'class_performance',
    ATTENDANCE_SUMMARY: 'attendance_summary',
    GRADE_ANALYSIS: 'grade_analysis',
    TEACHER_PERFORMANCE: 'teacher_performance',
    SCHOOL_OVERVIEW: 'school_overview',
    PARENT_REPORT: 'parent_report',
    ADMINISTRATIVE: 'administrative'
  }

  static getTemplate(type) {
    const templates = {
      [this.TEMPLATE_TYPES.STUDENT_PROGRESS]: {
        title: 'Student Progress Report',
        sections: [
          { id: 'header', type: 'header', required: true },
          { id: 'student_info', type: 'student_details', required: true },
          { id: 'academic_summary', type: 'summary_stats', required: true },
          { id: 'subject_breakdown', type: 'subject_table', required: true },
          { id: 'attendance_chart', type: 'chart', chartType: 'line', required: false },
          { id: 'grade_trends', type: 'chart', chartType: 'bar', required: false },
          { id: 'recommendations', type: 'text_block', required: false },
          { id: 'footer', type: 'footer', required: true }
        ],
        variables: ['student', 'grades', 'attendance', 'period', 'school']
      },
      
      [this.TEMPLATE_TYPES.CLASS_PERFORMANCE]: {
        title: 'Class Performance Analysis',
        sections: [
          { id: 'header', type: 'header', required: true },
          { id: 'class_info', type: 'class_details', required: true },
          { id: 'performance_overview', type: 'summary_stats', required: true },
          { id: 'grade_distribution', type: 'chart', chartType: 'pie', required: true },
          { id: 'student_rankings', type: 'ranking_table', required: true },
          { id: 'subject_comparison', type: 'chart', chartType: 'bar', required: false },
          { id: 'insights', type: 'text_block', required: true },
          { id: 'footer', type: 'footer', required: true }
        ],
        variables: ['class', 'students', 'grades', 'subjects', 'period', 'school']
      },

      [this.TEMPLATE_TYPES.ATTENDANCE_SUMMARY]: {
        title: 'Attendance Summary Report',
        sections: [
          { id: 'header', type: 'header', required: true },
          { id: 'period_info', type: 'period_details', required: true },
          { id: 'attendance_stats', type: 'summary_stats', required: true },
          { id: 'attendance_trends', type: 'chart', chartType: 'line', required: true },
          { id: 'risk_students', type: 'alert_table', required: true },
          { id: 'class_comparison', type: 'chart', chartType: 'bar', required: false },
          { id: 'recommendations', type: 'text_block', required: true },
          { id: 'footer', type: 'footer', required: true }
        ],
        variables: ['attendance', 'students', 'classes', 'period', 'school']
      }
    }

    return templates[type] || null
  }

  static processTemplate(template, data) {
    const processedSections = template.sections.map(section => {
      return {
        ...section,
        content: this.generateSectionContent(section, data, template.variables)
      }
    })

    return {
      ...template,
      sections: processedSections,
      generatedAt: new Date(),
      dataHash: this.generateDataHash(data)
    }
  }

  static generateSectionContent(section, data, variables) {
    switch (section.type) {
      case 'header':
        return this.generateHeader(data)
      
      case 'student_details':
        return this.generateStudentDetails(data.student)
      
      case 'class_details':
        return this.generateClassDetails(data.class)
      
      case 'summary_stats':
        return this.generateSummaryStats(data, section.id)
      
      case 'subject_table':
        return this.generateSubjectTable(data.grades, data.subjects)
      
      case 'ranking_table':
        return this.generateRankingTable(data.students)
      
      case 'alert_table':
        return this.generateAlertTable(data.riskStudents || [])
      
      case 'chart':
        return this.generateChartConfig(section, data)
      
      case 'text_block':
        return this.generateTextBlock(section.id, data)
      
      case 'footer':
        return this.generateFooter(data)
      
      default:
        return { type: 'unknown', content: 'Unknown section type' }
    }
  }

  static generateHeader(data) {
    return {
      type: 'header',
      schoolName: data.school?.name || 'School Management System',
      schoolLogo: data.school?.logo || '/images/school-logo.png',
      reportTitle: data.reportTitle || 'Academic Report',
      generatedDate: new Date().toLocaleDateString(),
      academicPeriod: data.period || 'Current Term'
    }
  }

  static generateStudentDetails(student) {
    return {
      type: 'student_details',
      name: student?.name || 'Unknown Student',
      studentId: student?.studentId || 'N/A',
      class: student?.class || 'N/A',
      admissionDate: student?.admissionDate || 'N/A',
      parentContact: student?.parentContact || 'N/A'
    }
  }

  static generateClassDetails(classData) {
    return {
      type: 'class_details',
      name: classData?.name || 'Unknown Class',
      teacher: classData?.teacher || 'N/A',
      studentCount: classData?.studentCount || 0,
      subjects: classData?.subjects || [],
      academicYear: classData?.academicYear || new Date().getFullYear()
    }
  }

  static generateSummaryStats(data, sectionId) {
    const stats = {}
    
    if (sectionId === 'academic_summary' && data.grades) {
      const classStats = ClassStatistics.calculateClassMetrics(data.grades)
      stats.averageGrade = Math.round(classStats.average)
      stats.totalSubjects = data.subjects?.length || 0
      stats.passedSubjects = data.grades?.filter(g => g.score >= 40).length || 0
      stats.rank = data.student?.rank || 'N/A'
    }
    
    if (sectionId === 'performance_overview' && data.students) {
      const allGrades = data.students.flatMap(s => s.grades || [])
      const classStats = ClassStatistics.calculateClassMetrics(allGrades)
      stats.classAverage = Math.round(classStats.average)
      stats.passRate = Math.round(classStats.passRate)
      stats.totalStudents = data.students.length
      stats.standardDeviation = Math.round(classStats.standardDeviation)
    }
    
    if (sectionId === 'attendance_stats' && data.attendance) {
      const totalDays = data.attendance.length
      const presentDays = data.attendance.filter(a => a.status === 'present').length
      stats.attendanceRate = Math.round((presentDays / totalDays) * 100)
      stats.totalDays = totalDays
      stats.presentDays = presentDays
      stats.absentDays = totalDays - presentDays
    }

    return { type: 'summary_stats', stats }
  }

  static generateSubjectTable(grades, subjects) {
    const subjectData = subjects?.map(subject => {
      const subjectGrades = grades?.filter(g => g.subjectId === subject.id) || []
      const average = subjectGrades.length > 0 
        ? subjectGrades.reduce((sum, g) => sum + g.score, 0) / subjectGrades.length 
        : 0
      
      return {
        subject: subject.name,
        grade: Math.round(average),
        letterGrade: this.getLetterGrade(average),
        status: average >= 40 ? 'Pass' : 'Fail',
        assessments: subjectGrades.length
      }
    }) || []

    return { type: 'subject_table', data: subjectData }
  }

  static generateRankingTable(students) {
    const rankings = students?.map(student => {
      const average = student.grades?.length > 0 
        ? student.grades.reduce((sum, g) => sum + g.score, 0) / student.grades.length 
        : 0
      
      return {
        name: student.name,
        studentId: student.studentId,
        average: Math.round(average),
        letterGrade: this.getLetterGrade(average),
        rank: student.rank || 'N/A'
      }
    }).sort((a, b) => b.average - a.average) || []

    return { type: 'ranking_table', data: rankings }
  }

  static generateAlertTable(riskStudents) {
    const alerts = riskStudents?.map(student => ({
      name: student.name,
      studentId: student.studentId,
      riskLevel: student.riskLevel || 'Medium',
      issue: student.primaryIssue || 'Performance concern',
      recommendation: student.recommendation || 'Monitor closely'
    })) || []

    return { type: 'alert_table', data: alerts }
  }

  static generateChartConfig(section, data) {
    const chartConfigs = {
      line: this.generateLineChartConfig(data),
      bar: this.generateBarChartConfig(data),
      pie: this.generatePieChartConfig(data)
    }

    return {
      type: 'chart',
      chartType: section.chartType,
      config: chartConfigs[section.chartType] || {}
    }
  }

  static generateLineChartConfig(data) {
    // Generate line chart for trends over time
    return {
      title: 'Performance Trend',
      xAxis: 'Time Period',
      yAxis: 'Score',
      data: data.trendData || []
    }
  }

  static generateBarChartConfig(data) {
    // Generate bar chart for comparisons
    return {
      title: 'Subject Comparison',
      xAxis: 'Subjects',
      yAxis: 'Average Score',
      data: data.subjectComparison || []
    }
  }

  static generatePieChartConfig(data) {
    // Generate pie chart for distributions
    return {
      title: 'Grade Distribution',
      data: data.gradeDistribution || []
    }
  }

  static generateTextBlock(blockId, data) {
    const textBlocks = {
      recommendations: this.generateRecommendations(data),
      insights: this.generateInsights(data)
    }

    return {
      type: 'text_block',
      content: textBlocks[blockId] || 'No content available'
    }
  }

  static generateRecommendations(data) {
    const recommendations = []
    
    if (data.student) {
      const average = data.grades?.reduce((sum, g) => sum + g.score, 0) / data.grades?.length || 0
      
      if (average < 40) {
        recommendations.push('Immediate academic support required')
        recommendations.push('Consider additional tutoring sessions')
      } else if (average < 60) {
        recommendations.push('Monitor progress closely')
        recommendations.push('Provide additional practice materials')
      } else if (average >= 80) {
        recommendations.push('Excellent performance - maintain current approach')
        recommendations.push('Consider advanced learning opportunities')
      }
    }

    return recommendations.join('\n')
  }

  static generateInsights(data) {
    const insights = []
    
    if (data.students) {
      const analysis = ComparativeAnalysis.compareClassPerformance({ class: data.students })
      insights.push(...analysis.insights)
    }

    return insights.join('\n')
  }

  static generateFooter(data) {
    return {
      type: 'footer',
      generatedBy: 'School Management System',
      generatedAt: new Date().toLocaleString(),
      version: '1.0.0',
      confidential: true
    }
  }

  static getLetterGrade(score) {
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 40) return 'D'
    return 'F'
  }

  static generateDataHash(data) {
    // Simple hash for data integrity
    return btoa(JSON.stringify(data)).slice(0, 16)
  }
}

/**
 * Export Engine
 * Handles multiple export formats
 */
export class ExportEngine {
  static FORMATS = {
    PDF: 'pdf',
    EXCEL: 'excel',
    CSV: 'csv',
    HTML: 'html',
    JSON: 'json'
  }

  static async exportReport(processedTemplate, format, options = {}) {
    switch (format) {
      case this.FORMATS.PDF:
        return this.exportToPDF(processedTemplate, options)
      
      case this.FORMATS.EXCEL:
        return this.exportToExcel(processedTemplate, options)
      
      case this.FORMATS.CSV:
        return this.exportToCSV(processedTemplate, options)
      
      case this.FORMATS.HTML:
        return this.exportToHTML(processedTemplate, options)
      
      case this.FORMATS.JSON:
        return this.exportToJSON(processedTemplate, options)
      
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  static async exportToPDF(template, options) {
    // Generate HTML first, then convert to PDF using browser's print functionality
    const html = this.generateHTML(template, { ...options, forPrint: true })
    
    return {
      format: 'pdf',
      content: html,
      filename: `${template.title.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
      mimeType: 'application/pdf'
    }
  }

  static async exportToExcel(template, options) {
    // Generate Excel-compatible data structure
    const workbook = {
      sheets: [],
      metadata: {
        title: template.title,
        generated: new Date().toISOString()
      }
    }

    // Extract tabular data from template sections
    template.sections.forEach(section => {
      if (section.content.type === 'subject_table' || section.content.type === 'ranking_table') {
        workbook.sheets.push({
          name: section.id,
          data: section.content.data
        })
      }
    })

    return {
      format: 'excel',
      content: workbook,
      filename: `${template.title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }

  static async exportToCSV(template, options) {
    // Extract first table from template
    const tableSection = template.sections.find(s => 
      s.content.type === 'subject_table' || s.content.type === 'ranking_table'
    )

    if (!tableSection) {
      throw new Error('No tabular data found for CSV export')
    }

    const csv = this.convertToCSV(tableSection.content.data)
    
    return {
      format: 'csv',
      content: csv,
      filename: `${template.title.replace(/\s+/g, '_')}_${Date.now()}.csv`,
      mimeType: 'text/csv'
    }
  }

  static async exportToHTML(template, options) {
    const html = this.generateHTML(template, options)
    
    return {
      format: 'html',
      content: html,
      filename: `${template.title.replace(/\s+/g, '_')}_${Date.now()}.html`,
      mimeType: 'text/html'
    }
  }

  static async exportToJSON(template, options) {
    return {
      format: 'json',
      content: JSON.stringify(template, null, 2),
      filename: `${template.title.replace(/\s+/g, '_')}_${Date.now()}.json`,
      mimeType: 'application/json'
    }
  }

  static generateHTML(template, options = {}) {
    const { forPrint = false } = options
    
    const styles = forPrint ? this.getPrintStyles() : this.getScreenStyles()
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${template.title}</title>
        <style>${styles}</style>
      </head>
      <body>
    `

    template.sections.forEach(section => {
      html += this.renderSection(section)
    })

    html += `
      </body>
      </html>
    `

    return html
  }

  static renderSection(section) {
    switch (section.content.type) {
      case 'header':
        return this.renderHeader(section.content)
      case 'summary_stats':
        return this.renderSummaryStats(section.content)
      case 'subject_table':
      case 'ranking_table':
      case 'alert_table':
        return this.renderTable(section.content)
      case 'text_block':
        return this.renderTextBlock(section.content)
      case 'footer':
        return this.renderFooter(section.content)
      default:
        return `<div class="section unknown">${JSON.stringify(section.content)}</div>`
    }
  }

  static renderHeader(content) {
    return `
      <header class="report-header">
        <div class="header-content">
          <h1>${content.reportTitle}</h1>
          <div class="school-info">
            <h2>${content.schoolName}</h2>
            <p>Generated: ${content.generatedDate}</p>
            <p>Period: ${content.academicPeriod}</p>
          </div>
        </div>
      </header>
    `
  }

  static renderSummaryStats(content) {
    const statsHtml = Object.entries(content.stats)
      .map(([key, value]) => `
        <div class="stat-item">
          <span class="stat-label">${key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
          <span class="stat-value">${value}</span>
        </div>
      `).join('')

    return `
      <section class="summary-stats">
        <h3>Summary Statistics</h3>
        <div class="stats-grid">
          ${statsHtml}
        </div>
      </section>
    `
  }

  static renderTable(content) {
    if (!content.data || content.data.length === 0) {
      return '<div class="no-data">No data available</div>'
    }

    const headers = Object.keys(content.data[0])
    const headerRow = headers.map(h => `<th>${h}</th>`).join('')
    const dataRows = content.data.map(row => 
      `<tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>`
    ).join('')

    return `
      <section class="data-table">
        <table>
          <thead>
            <tr>${headerRow}</tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
      </section>
    `
  }

  static renderTextBlock(content) {
    return `
      <section class="text-block">
        <pre>${content.content}</pre>
      </section>
    `
  }

  static renderFooter(content) {
    return `
      <footer class="report-footer">
        <p>Generated by ${content.generatedBy} on ${content.generatedAt}</p>
        ${content.confidential ? '<p class="confidential">CONFIDENTIAL</p>' : ''}
      </footer>
    `
  }

  static convertToCSV(data) {
    if (!data || data.length === 0) return ''
    
    const headers = Object.keys(data[0])
    const csvRows = [headers.join(',')]
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || ''
        return `"${String(value).replace(/"/g, '""')}"`
      })
      csvRows.push(values.join(','))
    })
    
    return csvRows.join('\n')
  }

  static getPrintStyles() {
    return `
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
      .report-header { border-bottom: 2px solid #333; margin-bottom: 20px; }
      .summary-stats { margin: 20px 0; }
      .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
      .stat-item { padding: 10px; border: 1px solid #ddd; }
      .data-table table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      .data-table th { background-color: #f5f5f5; }
      .report-footer { border-top: 1px solid #ddd; margin-top: 40px; padding-top: 20px; }
      .confidential { color: red; font-weight: bold; }
      @page { margin: 1in; }
    `
  }

  static getScreenStyles() {
    return this.getPrintStyles() + `
      body { background-color: #f5f5f5; }
      .report-header, .summary-stats, .data-table, .text-block { 
        background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
      }
    `
  }
}
