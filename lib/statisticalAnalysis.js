/**
 * Statistical Performance Analysis Library
 * Advanced statistical calculations without external APIs
 */

/**
 * Class Performance Statistics
 * Calculate comprehensive class-level statistics
 */
export class ClassStatistics {
  static calculateClassMetrics(studentGrades) {
    if (!studentGrades || studentGrades.length === 0) {
      return {
        average: 0,
        median: 0,
        standardDeviation: 0,
        variance: 0,
        range: { min: 0, max: 0 },
        quartiles: { q1: 0, q2: 0, q3: 0 },
        distribution: {},
        passRate: 0,
        gradeDistribution: {}
      }
    }

    const scores = studentGrades.map(g => Number(g.score)).filter(s => !isNaN(s))
    const sortedScores = [...scores].sort((a, b) => a - b)

    return {
      average: this.calculateMean(scores),
      median: this.calculateMedian(sortedScores),
      standardDeviation: this.calculateStandardDeviation(scores),
      variance: this.calculateVariance(scores),
      range: { min: Math.min(...scores), max: Math.max(...scores) },
      quartiles: this.calculateQuartiles(sortedScores),
      distribution: this.calculateDistribution(scores),
      passRate: this.calculatePassRate(scores),
      gradeDistribution: this.calculateGradeDistribution(scores),
      percentiles: this.calculatePercentiles(sortedScores)
    }
  }

  static calculateMean(scores) {
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
  }

  static calculateMedian(sortedScores) {
    const length = sortedScores.length
    if (length === 0) return 0
    
    const middle = Math.floor(length / 2)
    return length % 2 === 0 
      ? (sortedScores[middle - 1] + sortedScores[middle]) / 2
      : sortedScores[middle]
  }

  static calculateVariance(scores) {
    if (scores.length === 0) return 0
    
    const mean = this.calculateMean(scores)
    const squaredDifferences = scores.map(score => Math.pow(score - mean, 2))
    return this.calculateMean(squaredDifferences)
  }

  static calculateStandardDeviation(scores) {
    return Math.sqrt(this.calculateVariance(scores))
  }

  static calculateQuartiles(sortedScores) {
    const length = sortedScores.length
    if (length === 0) return { q1: 0, q2: 0, q3: 0 }

    const q1Index = Math.floor(length * 0.25)
    const q2Index = Math.floor(length * 0.5)
    const q3Index = Math.floor(length * 0.75)

    return {
      q1: sortedScores[q1Index] || 0,
      q2: this.calculateMedian(sortedScores),
      q3: sortedScores[q3Index] || 0
    }
  }

  static calculateDistribution(scores) {
    const ranges = {
      '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0
    }

    scores.forEach(score => {
      if (score <= 20) ranges['0-20']++
      else if (score <= 40) ranges['21-40']++
      else if (score <= 60) ranges['41-60']++
      else if (score <= 80) ranges['61-80']++
      else ranges['81-100']++
    })

    return ranges
  }

  static calculatePassRate(scores, passMark = 40) {
    const passCount = scores.filter(score => score >= passMark).length
    return scores.length > 0 ? (passCount / scores.length) * 100 : 0
  }

  static calculateGradeDistribution(scores) {
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 }

    scores.forEach(score => {
      if (score >= 80) grades.A++
      else if (score >= 70) grades.B++
      else if (score >= 60) grades.C++
      else if (score >= 40) grades.D++
      else grades.F++
    })

    return grades
  }

  static calculatePercentiles(sortedScores) {
    const percentiles = {}
    const percentileValues = [10, 25, 50, 75, 90, 95, 99]

    percentileValues.forEach(p => {
      const index = Math.ceil((p / 100) * sortedScores.length) - 1
      percentiles[`p${p}`] = sortedScores[Math.max(0, index)] || 0
    })

    return percentiles
  }
}

/**
 * Trend Analysis Engine
 * Analyze performance trends over time using moving averages
 */
export class TrendAnalysis {
  static analyzePerformanceTrend(timeSeriesData, windowSize = 3) {
    if (!timeSeriesData || timeSeriesData.length < windowSize) {
      return {
        trend: 'insufficient_data',
        strength: 0,
        movingAverages: [],
        trendLine: null,
        forecast: null
      }
    }

    const movingAverages = this.calculateMovingAverages(timeSeriesData, windowSize)
    const trendLine = this.calculateTrendLine(timeSeriesData)
    
    return {
      trend: this.determineTrendDirection(movingAverages),
      strength: this.calculateTrendStrength(movingAverages),
      movingAverages,
      trendLine,
      forecast: this.generateSimpleForecast(timeSeriesData, 3),
      volatility: this.calculateVolatility(timeSeriesData),
      seasonality: this.detectSeasonality(timeSeriesData)
    }
  }

  static calculateMovingAverages(data, windowSize) {
    const movingAverages = []
    
    for (let i = windowSize - 1; i < data.length; i++) {
      const window = data.slice(i - windowSize + 1, i + 1)
      const average = window.reduce((sum, item) => sum + item.value, 0) / windowSize
      
      movingAverages.push({
        date: data[i].date,
        value: average,
        originalValue: data[i].value
      })
    }
    
    return movingAverages
  }

  static calculateTrendLine(data) {
    const n = data.length
    if (n < 2) return null

    // Simple linear regression
    const xValues = data.map((_, index) => index)
    const yValues = data.map(item => item.value)
    
    const sumX = xValues.reduce((sum, x) => sum + x, 0)
    const sumY = yValues.reduce((sum, y) => sum + y, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    return {
      slope,
      intercept,
      equation: `y = ${slope.toFixed(2)}x + ${intercept.toFixed(2)}`,
      correlation: this.calculateCorrelation(xValues, yValues)
    }
  }

  static calculateCorrelation(xValues, yValues) {
    const n = xValues.length
    const sumX = xValues.reduce((sum, x) => sum + x, 0)
    const sumY = yValues.reduce((sum, y) => sum + y, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  static determineTrendDirection(movingAverages) {
    if (movingAverages.length < 2) return 'stable'
    
    const first = movingAverages[0].value
    const last = movingAverages[movingAverages.length - 1].value
    const change = ((last - first) / first) * 100
    
    if (change > 5) return 'increasing'
    if (change < -5) return 'decreasing'
    return 'stable'
  }

  static calculateTrendStrength(movingAverages) {
    if (movingAverages.length < 2) return 0
    
    const values = movingAverages.map(ma => ma.value)
    const first = values[0]
    const last = values[values.length - 1]
    
    return Math.abs(((last - first) / first) * 100)
  }

  static generateSimpleForecast(data, periods) {
    if (data.length < 3) return null
    
    const trendLine = this.calculateTrendLine(data)
    if (!trendLine) return null
    
    const forecast = []
    const lastIndex = data.length - 1
    
    for (let i = 1; i <= periods; i++) {
      const forecastValue = trendLine.slope * (lastIndex + i) + trendLine.intercept
      forecast.push({
        period: i,
        value: Math.max(0, forecastValue), // Ensure non-negative values
        confidence: Math.max(0.5, 1 - (i * 0.1)) // Decreasing confidence
      })
    }
    
    return forecast
  }

  static calculateVolatility(data) {
    if (data.length < 2) return 0
    
    const values = data.map(item => item.value)
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    const squaredDeviations = values.map(value => Math.pow(value - mean, 2))
    const variance = squaredDeviations.reduce((sum, dev) => sum + dev, 0) / values.length
    
    return Math.sqrt(variance)
  }

  static detectSeasonality(data) {
    // Simple seasonality detection for academic terms
    if (data.length < 12) return null
    
    const monthlyAverages = {}
    
    data.forEach(item => {
      const month = new Date(item.date).getMonth()
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = { sum: 0, count: 0 }
      }
      monthlyAverages[month].sum += item.value
      monthlyAverages[month].count++
    })
    
    const seasonalPattern = {}
    Object.entries(monthlyAverages).forEach(([month, data]) => {
      seasonalPattern[month] = data.sum / data.count
    })
    
    return seasonalPattern
  }
}

/**
 * Comparative Analysis Engine
 * Compare performance across subjects, classes, and terms
 */
export class ComparativeAnalysis {
  static compareSubjectPerformance(subjectData) {
    const comparison = {}
    
    Object.entries(subjectData).forEach(([subject, grades]) => {
      comparison[subject] = ClassStatistics.calculateClassMetrics(grades)
    })
    
    // Rank subjects by average performance
    const rankings = Object.entries(comparison)
      .map(([subject, stats]) => ({ subject, average: stats.average }))
      .sort((a, b) => b.average - a.average)
    
    return {
      subjectStats: comparison,
      rankings,
      insights: this.generateSubjectInsights(comparison)
    }
  }

  static compareClassPerformance(classData) {
    const comparison = {}
    
    Object.entries(classData).forEach(([className, grades]) => {
      comparison[className] = ClassStatistics.calculateClassMetrics(grades)
    })
    
    return {
      classStats: comparison,
      insights: this.generateClassInsights(comparison)
    }
  }

  static compareTermPerformance(termData) {
    const comparison = {}
    
    Object.entries(termData).forEach(([term, grades]) => {
      comparison[term] = ClassStatistics.calculateClassMetrics(grades)
    })
    
    return {
      termStats: comparison,
      trends: this.analyzeTermTrends(comparison),
      insights: this.generateTermInsights(comparison)
    }
  }

  static generateSubjectInsights(subjectStats) {
    const insights = []
    const subjects = Object.entries(subjectStats)
    
    // Find best and worst performing subjects
    const sorted = subjects.sort((a, b) => b[1].average - a[1].average)
    const best = sorted[0]
    const worst = sorted[sorted.length - 1]
    
    insights.push(`Best performing subject: ${best[0]} (${best[1].average.toFixed(1)}% average)`)
    insights.push(`Most challenging subject: ${worst[0]} (${worst[1].average.toFixed(1)}% average)`)
    
    // Find subjects with high variability
    const highVariability = subjects.filter(([_, stats]) => stats.standardDeviation > 20)
    if (highVariability.length > 0) {
      insights.push(`High performance variability in: ${highVariability.map(([subject]) => subject).join(', ')}`)
    }
    
    return insights
  }

  static generateClassInsights(classStats) {
    const insights = []
    const classes = Object.entries(classStats)
    
    // Performance comparison
    const averages = classes.map(([className, stats]) => ({ className, average: stats.average }))
    const topClass = averages.reduce((max, current) => current.average > max.average ? current : max)
    
    insights.push(`Top performing class: ${topClass.className} (${topClass.average.toFixed(1)}% average)`)
    
    return insights
  }

  static generateTermInsights(termStats) {
    const insights = []
    const terms = Object.entries(termStats)
    
    if (terms.length >= 2) {
      const termAverages = terms.map(([term, stats]) => ({ term, average: stats.average }))
      const improvement = termAverages[termAverages.length - 1].average - termAverages[0].average
      
      if (improvement > 5) {
        insights.push('Overall performance improving across terms')
      } else if (improvement < -5) {
        insights.push('Performance declining - intervention needed')
      } else {
        insights.push('Performance stable across terms')
      }
    }
    
    return insights
  }

  static analyzeTermTrends(termStats) {
    const terms = Object.keys(termStats).sort()
    const trendData = terms.map((term, index) => ({
      date: term,
      value: termStats[term].average
    }))
    
    return TrendAnalysis.analyzePerformanceTrend(trendData)
  }
}

/**
 * Correlation Analysis
 * Analyze relationships between different performance metrics
 */
export class CorrelationAnalysis {
  static analyzeAttendancePerformanceCorrelation(studentData) {
    const correlationData = studentData.map(student => ({
      attendance: student.attendanceRate || 0,
      performance: student.averageGrade || 0
    })).filter(data => data.attendance > 0 && data.performance > 0)
    
    if (correlationData.length < 3) {
      return { correlation: 0, strength: 'insufficient_data', insights: [] }
    }
    
    const attendanceValues = correlationData.map(d => d.attendance)
    const performanceValues = correlationData.map(d => d.performance)
    
    const correlation = TrendAnalysis.calculateCorrelation(attendanceValues, performanceValues)
    
    return {
      correlation,
      strength: this.interpretCorrelationStrength(correlation),
      insights: this.generateCorrelationInsights(correlation, 'attendance', 'performance'),
      scatterData: correlationData
    }
  }

  static interpretCorrelationStrength(correlation) {
    const abs = Math.abs(correlation)
    if (abs >= 0.8) return 'very_strong'
    if (abs >= 0.6) return 'strong'
    if (abs >= 0.4) return 'moderate'
    if (abs >= 0.2) return 'weak'
    return 'very_weak'
  }

  static generateCorrelationInsights(correlation, variable1, variable2) {
    const insights = []
    const strength = this.interpretCorrelationStrength(correlation)
    
    if (correlation > 0.5) {
      insights.push(`Strong positive relationship between ${variable1} and ${variable2}`)
      insights.push(`Improving ${variable1} likely to improve ${variable2}`)
    } else if (correlation < -0.5) {
      insights.push(`Strong negative relationship between ${variable1} and ${variable2}`)
    } else if (Math.abs(correlation) < 0.2) {
      insights.push(`Little to no relationship between ${variable1} and ${variable2}`)
    }
    
    return insights
  }
}
