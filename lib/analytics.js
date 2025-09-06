/**
 * Smart Analytics Library - Rule-Based Early Warning Systems
 * No AI APIs required - Pure statistical analysis and pattern recognition
 */

// ===== EARLY WARNING SYSTEMS =====

/**
 * Attendance Pattern Analysis
 * Flags students based on attendance patterns and thresholds
 */
export class AttendanceAnalyzer {
  static THRESHOLDS = {
    CRITICAL: 60,    // Below 60% - Critical intervention needed
    WARNING: 75,     // Below 75% - Warning level
    CONCERN: 85      // Below 85% - Monitor closely
  }

  static analyzeAttendance(attendanceRecords) {
    const analysis = {
      overall: 0,
      trend: 'stable',
      riskLevel: 'low',
      patterns: [],
      recommendations: []
    }

    if (!attendanceRecords || attendanceRecords.length === 0) {
      return { ...analysis, riskLevel: 'unknown' }
    }

    // Calculate overall attendance rate
    const totalDays = attendanceRecords.length
    const presentDays = attendanceRecords.filter(record => record.status === 'present').length
    analysis.overall = Math.round((presentDays / totalDays) * 100)

    // Determine risk level
    if (analysis.overall < this.THRESHOLDS.CRITICAL) {
      analysis.riskLevel = 'critical'
      analysis.recommendations.push('Immediate parent meeting required')
      analysis.recommendations.push('Consider attendance intervention program')
    } else if (analysis.overall < this.THRESHOLDS.WARNING) {
      analysis.riskLevel = 'high'
      analysis.recommendations.push('Schedule parent consultation')
      analysis.recommendations.push('Monitor weekly attendance')
    } else if (analysis.overall < this.THRESHOLDS.CONCERN) {
      analysis.riskLevel = 'medium'
      analysis.recommendations.push('Send attendance reminder to parents')
    }

    // Analyze attendance trends (last 4 weeks vs previous 4 weeks)
    if (attendanceRecords.length >= 8) {
      const recent = attendanceRecords.slice(-4)
      const previous = attendanceRecords.slice(-8, -4)
      
      const recentRate = (recent.filter(r => r.status === 'present').length / 4) * 100
      const previousRate = (previous.filter(r => r.status === 'present').length / 4) * 100
      
      if (recentRate < previousRate - 10) {
        analysis.trend = 'declining'
        analysis.patterns.push('Attendance declining in recent weeks')
      } else if (recentRate > previousRate + 10) {
        analysis.trend = 'improving'
        analysis.patterns.push('Attendance improving in recent weeks')
      }
    }

    // Pattern detection
    this.detectAttendancePatterns(attendanceRecords, analysis)

    return analysis
  }

  static detectAttendancePatterns(records, analysis) {
    // Detect consecutive absences
    let consecutiveAbsences = 0
    let maxConsecutive = 0
    
    records.forEach(record => {
      if (record.status === 'absent') {
        consecutiveAbsences++
        maxConsecutive = Math.max(maxConsecutive, consecutiveAbsences)
      } else {
        consecutiveAbsences = 0
      }
    })

    if (maxConsecutive >= 3) {
      analysis.patterns.push(`${maxConsecutive} consecutive absences detected`)
      analysis.recommendations.push('Investigate reasons for extended absences')
    }

    // Detect day-of-week patterns
    const dayPatterns = {}
    records.forEach(record => {
      const day = new Date(record.date).getDay()
      if (!dayPatterns[day]) dayPatterns[day] = { present: 0, absent: 0 }
      dayPatterns[day][record.status]++
    })

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    Object.entries(dayPatterns).forEach(([day, counts]) => {
      const absentRate = (counts.absent / (counts.present + counts.absent)) * 100
      if (absentRate > 30) {
        analysis.patterns.push(`High absence rate on ${dayNames[day]}s (${Math.round(absentRate)}%)`)
      }
    })
  }
}

/**
 * Grade Trend Analysis
 * Analyzes grade patterns and identifies declining performance
 */
export class GradeTrendAnalyzer {
  static analyzeGradeTrends(gradeHistory) {
    const analysis = {
      currentAverage: 0,
      trend: 'stable',
      trendStrength: 0,
      riskLevel: 'low',
      patterns: [],
      recommendations: []
    }

    if (!gradeHistory || gradeHistory.length === 0) {
      return analysis
    }

    // Calculate current average
    const validGrades = gradeHistory.filter(g => g.score !== null && g.score !== undefined)
    analysis.currentAverage = validGrades.reduce((sum, g) => sum + Number(g.score), 0) / validGrades.length

    // Trend analysis using moving averages
    if (validGrades.length >= 4) {
      const recentAvg = this.calculateMovingAverage(validGrades.slice(-3))
      const previousAvg = this.calculateMovingAverage(validGrades.slice(-6, -3))
      
      const trendDifference = recentAvg - previousAvg
      analysis.trendStrength = Math.abs(trendDifference)

      if (trendDifference < -5) {
        analysis.trend = 'declining'
        analysis.riskLevel = trendDifference < -10 ? 'high' : 'medium'
        analysis.recommendations.push('Schedule academic support meeting')
        analysis.recommendations.push('Consider additional tutoring')
      } else if (trendDifference > 5) {
        analysis.trend = 'improving'
        analysis.recommendations.push('Continue current study approach')
      }
    }

    // Risk assessment based on current performance
    if (analysis.currentAverage < 40) {
      analysis.riskLevel = 'critical'
      analysis.recommendations.push('Immediate academic intervention required')
    } else if (analysis.currentAverage < 50) {
      analysis.riskLevel = 'high'
      analysis.recommendations.push('Close monitoring and support needed')
    }

    // Pattern detection
    this.detectGradePatterns(validGrades, analysis)

    return analysis
  }

  static calculateMovingAverage(grades) {
    if (grades.length === 0) return 0
    return grades.reduce((sum, g) => sum + Number(g.score), 0) / grades.length
  }

  static detectGradePatterns(grades, analysis) {
    // Detect consecutive failures
    let consecutiveFailures = 0
    let maxConsecutiveFailures = 0

    grades.forEach(grade => {
      if (Number(grade.score) < 40) {
        consecutiveFailures++
        maxConsecutiveFailures = Math.max(maxConsecutiveFailures, consecutiveFailures)
      } else {
        consecutiveFailures = 0
      }
    })

    if (maxConsecutiveFailures >= 2) {
      analysis.patterns.push(`${maxConsecutiveFailures} consecutive failing grades`)
      analysis.riskLevel = 'high'
    }

    // Detect subject-specific patterns
    const subjectPerformance = {}
    grades.forEach(grade => {
      if (!subjectPerformance[grade.subject]) {
        subjectPerformance[grade.subject] = []
      }
      subjectPerformance[grade.subject].push(Number(grade.score))
    })

    Object.entries(subjectPerformance).forEach(([subject, scores]) => {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
      if (average < 40) {
        analysis.patterns.push(`Consistently struggling in ${subject} (avg: ${Math.round(average)}%)`)
      }
    })
  }
}

/**
 * Assignment Tracking System
 * Monitors assignment completion and identifies at-risk students
 */
export class AssignmentTracker {
  static analyzeAssignmentCompletion(assignments) {
    const analysis = {
      completionRate: 0,
      missedAssignments: 0,
      lateSubmissions: 0,
      riskLevel: 'low',
      patterns: [],
      recommendations: []
    }

    if (!assignments || assignments.length === 0) {
      return analysis
    }

    // Calculate completion metrics
    const completed = assignments.filter(a => a.status === 'completed').length
    const late = assignments.filter(a => a.status === 'late').length
    const missed = assignments.filter(a => a.status === 'missing').length

    analysis.completionRate = Math.round((completed / assignments.length) * 100)
    analysis.missedAssignments = missed
    analysis.lateSubmissions = late

    // Risk assessment
    if (missed >= 3 || analysis.completionRate < 60) {
      analysis.riskLevel = 'critical'
      analysis.recommendations.push('Immediate academic support required')
      analysis.recommendations.push('Parent meeting to discuss assignment completion')
    } else if (missed >= 2 || analysis.completionRate < 75) {
      analysis.riskLevel = 'high'
      analysis.recommendations.push('Monitor assignment completion closely')
      analysis.recommendations.push('Provide additional assignment support')
    } else if (late >= 3 || analysis.completionRate < 85) {
      analysis.riskLevel = 'medium'
      analysis.recommendations.push('Help with time management skills')
    }

    // Pattern detection
    this.detectAssignmentPatterns(assignments, analysis)

    return analysis
  }

  static detectAssignmentPatterns(assignments, analysis) {
    // Detect recent decline in completion
    if (assignments.length >= 6) {
      const recent = assignments.slice(-3)
      const previous = assignments.slice(-6, -3)
      
      const recentCompletion = recent.filter(a => a.status === 'completed').length / 3
      const previousCompletion = previous.filter(a => a.status === 'completed').length / 3
      
      if (recentCompletion < previousCompletion - 0.3) {
        analysis.patterns.push('Assignment completion declining recently')
      }
    }

    // Detect subject-specific issues
    const subjectCompletion = {}
    assignments.forEach(assignment => {
      if (!subjectCompletion[assignment.subject]) {
        subjectCompletion[assignment.subject] = { completed: 0, total: 0 }
      }
      subjectCompletion[assignment.subject].total++
      if (assignment.status === 'completed') {
        subjectCompletion[assignment.subject].completed++
      }
    })

    Object.entries(subjectCompletion).forEach(([subject, data]) => {
      const rate = (data.completed / data.total) * 100
      if (rate < 70) {
        analysis.patterns.push(`Low completion rate in ${subject} (${Math.round(rate)}%)`)
      }
    })
  }
}

/**
 * Automated Alert System
 * Generates alerts based on predefined thresholds and rules
 */
export class AlertSystem {
  static ALERT_TYPES = {
    ATTENDANCE: 'attendance',
    GRADES: 'grades',
    ASSIGNMENTS: 'assignments',
    BEHAVIOR: 'behavior'
  }

  static PRIORITY_LEVELS = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
  }

  static generateAlerts(studentData) {
    const alerts = []

    // Attendance alerts
    const attendanceAnalysis = AttendanceAnalyzer.analyzeAttendance(studentData.attendance)
    if (attendanceAnalysis.riskLevel === 'critical') {
      alerts.push({
        type: this.ALERT_TYPES.ATTENDANCE,
        priority: this.PRIORITY_LEVELS.CRITICAL,
        title: 'Critical Attendance Issue',
        message: `Student attendance is ${attendanceAnalysis.overall}% - Immediate intervention required`,
        studentId: studentData.id,
        timestamp: new Date(),
        actions: ['parent_meeting', 'counselor_referral']
      })
    } else if (attendanceAnalysis.riskLevel === 'high') {
      alerts.push({
        type: this.ALERT_TYPES.ATTENDANCE,
        priority: this.PRIORITY_LEVELS.HIGH,
        title: 'Low Attendance Warning',
        message: `Student attendance is ${attendanceAnalysis.overall}% - Monitor closely`,
        studentId: studentData.id,
        timestamp: new Date(),
        actions: ['parent_contact', 'attendance_plan']
      })
    }

    // Grade alerts
    const gradeAnalysis = GradeTrendAnalyzer.analyzeGradeTrends(studentData.grades)
    if (gradeAnalysis.riskLevel === 'critical') {
      alerts.push({
        type: this.ALERT_TYPES.GRADES,
        priority: this.PRIORITY_LEVELS.CRITICAL,
        title: 'Academic Performance Crisis',
        message: `Student average is ${Math.round(gradeAnalysis.currentAverage)}% with declining trend`,
        studentId: studentData.id,
        timestamp: new Date(),
        actions: ['academic_support', 'parent_meeting', 'tutoring']
      })
    }

    // Assignment alerts
    const assignmentAnalysis = AssignmentTracker.analyzeAssignmentCompletion(studentData.assignments)
    if (assignmentAnalysis.missedAssignments >= 3) {
      alerts.push({
        type: this.ALERT_TYPES.ASSIGNMENTS,
        priority: this.PRIORITY_LEVELS.HIGH,
        title: 'Multiple Missing Assignments',
        message: `Student has ${assignmentAnalysis.missedAssignments} missing assignments`,
        studentId: studentData.id,
        timestamp: new Date(),
        actions: ['assignment_support', 'time_management']
      })
    }

    return alerts.sort((a, b) => b.priority - a.priority)
  }

  static shouldTriggerParentNotification(alerts) {
    return alerts.some(alert => 
      alert.priority >= this.PRIORITY_LEVELS.HIGH || 
      alert.actions.includes('parent_meeting') || 
      alert.actions.includes('parent_contact')
    )
  }
}
