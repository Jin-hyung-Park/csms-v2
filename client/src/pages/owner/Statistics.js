import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Stack,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  TextField
} from '@mui/material';
import { Download as DownloadIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { getStatistics, getWeeklyStatistics } from '../../services/ownerService';
import ownerService from '../../services/ownerService';
import monthlySalaryService from '../../services/monthlySalaryService';
import { StoreSelector } from '../../components/common';
import { useStoreSelection } from '../../hooks/useMeta';
import { useIsMobile } from '../../hooks/useMediaQuery';

// API 베이스 URL (배포 시 REACT_APP_API_URL로 설정, 미설정 시 동일 오리진 /api)
const getApiBase = () => {
  const env = process.env.REACT_APP_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined') return `${window.location.origin}/api`;
  return '/api';
};
const API_BASE = getApiBase();

const Statistics = () => {
  const isMobile = useIsMobile();
  const [statistics, setStatistics] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateData, setSelectedDateData] = useState(null);
  const [bottomDetailData, setBottomDetailData] = useState(null); // 하단 상세 정보용 상태 추가
  const [selectedCalendarWeek, setSelectedCalendarWeek] = useState('all'); // 달력용 주차 선택 상태 추가
  const [selectedWeek, setSelectedWeek] = useState('all'); // 주차 선택 상태 추가
  const [filters, setFilters] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM 형식
    selectedEmployee: 'all' // 직원 필터 추가
  });

  const [excelLoading, setExcelLoading] = useState(false);
  const [employees, setEmployees] = useState([]); // 직원 목록 상태 추가
  
  // 월별 급여 확정 관련 상태
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // 주휴수당 관리 관련 상태
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogData, setEditDialogData] = useState(null);
  const [adjustedAmount, setAdjustedAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  // 점포 선택 훅
  const { selectedStoreId, stores } = useStoreSelection();
  
  // 현재 선택된 점포 이름
  const currentStoreName = stores.find(store => store._id === selectedStoreId)?.name || '점포 선택';

  const fetchStatistics = useCallback(async () => {
    if (!selectedStoreId) return;
    
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching statistics with filters:', { selectedStoreId, month: filters.month });
      const weeklyData = await getWeeklyStatistics(selectedStoreId, filters.month);
      console.log('Weekly data received:', weeklyData);
      
      // 주차별 통계 데이터를 달력보기용 데이터로 변환
      // tabValue === 0은 달력보기, tabValue === 1은 직원별 주차 통계
      const isCalendarView = tabValue === 0;
      const dailyData = convertWeeklyStatsToDailyStats(weeklyData, filters.month, filters.selectedEmployee, isCalendarView);
      console.log('Converted daily data:', dailyData);
      
      setStatistics(dailyData);
      setWeeklyStats(weeklyData);
    } catch (err) {
      console.error('Statistics fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStoreId, filters.month, filters.selectedEmployee, tabValue]);

  // 직원 목록 가져오기
  const fetchEmployees = useCallback(async () => {
    try {
      const response = await ownerService.getEmployees({ isActive: true });
      setEmployees(response.employees || []);
    } catch (err) {
      console.error('Employees fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // 디버깅용: bottomDetailData 상태 변화 추적
  useEffect(() => {
    console.log('bottomDetailData changed:', bottomDetailData);
  }, [bottomDetailData]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 필터가 변경되면 주차 선택 초기화
    if (field === 'month' || field === 'selectedEmployee') {
      setSelectedWeek('all');
      setSelectedCalendarWeek('all');
    }
  };

  // 엑셀 다운로드 핸들러
  const handleExcelDownload = async () => {
    try {
      setExcelLoading(true);
      const [year, month] = filters.month.split('-');
      await ownerService.downloadSalaryReport(year, month);
    } catch (error) {
      console.error('Excel download error:', error);
      setError('엑셀 파일 다운로드에 실패했습니다');
    } finally {
      setExcelLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const formatHours = (hours) => {
    return `${hours.toFixed(1)}h`;
  };

  // 주차별 통계 데이터를 달력보기용 데이터로 변환하는 함수
  const convertWeeklyStatsToDailyStats = (weeklyData, month, selectedEmployee = "all", isCalendarView = false) => {
    console.log('=== convertWeeklyStatsToDailyStats 시작 ===');
    console.log('selectedEmployee:', selectedEmployee);
    console.log('month:', month);
    console.log('isCalendarView:', isCalendarView);
    console.log('weeklyData:', weeklyData);
    
    if (!weeklyData || !weeklyData.employeeWeeklyStats) {
      console.log('weeklyData 또는 employeeWeeklyStats가 없음');
      return {
        dailyStats: [],
        monthlyTotal: {
          totalHours: 0,
          totalPay: 0,
          totalWorkDays: 0
        }
      };
    }

    const dailyStatsMap = {};
    let totalMonthlyHours = 0;
    let totalMonthlyPay = 0;
    const workDaysSet = new Set();

    // 각 직원의 주차별 데이터를 일별 데이터로 변환
    Object.keys(weeklyData.employeeWeeklyStats).forEach(employeeName => {
      console.log(`n처리할 직원: ${employeeName}, 선택된 직원: ${selectedEmployee}`);
      // 달력보기가 아닐 때만 직원 필터링 적용
      if (!isCalendarView && selectedEmployee !== "all" && employeeName !== selectedEmployee) {
        console.log(`직원 필터링으로 인해 ${employeeName} 건너뛰기`);
        return;
      }
      const employeeWeeks = weeklyData.employeeWeeklyStats[employeeName];
      console.log(`\n=== ${employeeName} 처리 시작 ===`);
      console.log('employeeWeeks:', employeeWeeks);
      
      Object.keys(employeeWeeks).forEach(weekKey => {
        const weekData = employeeWeeks[weekKey];
        console.log(`\n--- ${employeeName} ${weekKey}주차 처리 ---`);
        console.log('weekData:', weekData);
        
        // 실제 스케줄 데이터가 있는 경우 사용
        if (weekData.schedules && weekData.schedules.length > 0) {
          console.log(`${employeeName} ${weekKey}주차 스케줄 개수:`, weekData.schedules.length);
          weekData.schedules.forEach((schedule, index) => {
            console.log(`스케줄 ${index + 1}:`, schedule);
            // schedule.workDate는 Date 객체 또는 문자열일 수 있음
            let scheduleDate;
            try {
              scheduleDate = schedule.workDate instanceof Date ? schedule.workDate : new Date(schedule.workDate);
              // 유효하지 않은 날짜인지 확인
              if (isNaN(scheduleDate.getTime())) {
                console.warn('Invalid date found:', schedule.workDate);
                return; // 이 스케줄은 건너뛰기
              }
            } catch (error) {
              console.warn('Error parsing date:', schedule.workDate, error);
              return; // 이 스케줄은 건너뛰기
            }
            
            const dateKey = scheduleDate.toISOString().split('T')[0];
            
            // 해당 월에 속하는 날짜만 처리
            const [year, monthNum] = month.split('-');
            const scheduleMonth = scheduleDate.getMonth() + 1;
            const scheduleYear = scheduleDate.getFullYear();
            
            if (scheduleYear === parseInt(year) && scheduleMonth === parseInt(monthNum)) {
              if (!dailyStatsMap[dateKey]) {
                dailyStatsMap[dateKey] = {
                  date: dateKey,
                  dayOfWeek: scheduleDate.toLocaleDateString('ko-KR', { weekday: 'long' }),
                  employees: [],
                  totalHours: 0,
                  totalPay: 0
                };
              }
              
              // 디버깅을 위한 로그 추가
              console.log('Schedule data:', {
                employeeName,
                date: dateKey,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                hours: schedule.hours,
                pay: schedule.pay,
                schedule: schedule
              });
              
              dailyStatsMap[dateKey].employees.push({
                name: employeeName,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
                workHours: schedule.hours || 0,
                pay: schedule.pay || 0,
                notes: ''
              });
              
              // 안전한 숫자 변환
              const hours = Number(schedule.hours) || 0;
              const pay = Number(schedule.pay) || 0;
              
              dailyStatsMap[dateKey].totalHours += hours;
              dailyStatsMap[dateKey].totalPay += pay;
              
              totalMonthlyHours += hours;
              totalMonthlyPay += pay;
              workDaysSet.add(dateKey);
            }
          });
        } else {
          // 스케줄 데이터가 없는 경우 주차별 데이터를 해당 주의 각 날짜로 분산
          if (weekData.startDate && weekData.endDate) {
            let startDate, endDate;
            try {
              startDate = new Date(weekData.startDate);
              endDate = new Date(weekData.endDate);
              
              // 유효하지 않은 날짜인지 확인
              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('Invalid date range found:', weekData.startDate, weekData.endDate);
                return; // 이 주차는 건너뛰기
              }
            } catch (error) {
              console.warn('Error parsing date range:', weekData.startDate, weekData.endDate, error);
              return; // 이 주차는 건너뛰기
            }
            
            // 해당 월에 속하는 날짜만 처리
            const [year, monthNum] = month.split('-');
            
            // 주차의 각 날짜를 순회
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const scheduleYear = d.getFullYear();
              const scheduleMonth = d.getMonth() + 1;
              
              if (scheduleYear === parseInt(year) && scheduleMonth === parseInt(monthNum)) {
                const dateKey = d.toISOString().split('T')[0];
                
                if (!dailyStatsMap[dateKey]) {
                  dailyStatsMap[dateKey] = {
                    date: dateKey,
                    dayOfWeek: d.toLocaleDateString('ko-KR', { weekday: 'long' }),
                    employees: [],
                    totalHours: 0,
                    totalPay: 0
                  };
                }
                
                // 주차별 평균 근무시간을 일별로 분산 (안전한 숫자 변환)
                const totalHours = Number(weekData.totalHours) || 0;
                const totalPay = Number(weekData.totalPay) || 0;
                const workDays = Number(weekData.workDays) || 1;
                const dailyHours = workDays > 0 ? totalHours / workDays : 0;
                const dailyPay = workDays > 0 ? totalPay / workDays : 0;
                
                // 실제 근무시간이 있는 경우에만 표시
                if (dailyHours > 0) {
                  dailyStatsMap[dateKey].employees.push({
                    name: employeeName,
                    startTime: '09:00', // 기본값
                    endTime: '18:00', // 기본값
                    workHours: dailyHours,
                    pay: dailyPay,
                    notes: `${weekData.weekNumber}주차`
                  });
                }
                
                // 안전한 숫자 변환
                const safeDailyHours = Number(dailyHours) || 0;
                const safeDailyPay = Number(dailyPay) || 0;
                
                dailyStatsMap[dateKey].totalHours += safeDailyHours;
                dailyStatsMap[dateKey].totalPay += safeDailyPay;
                
                totalMonthlyHours += safeDailyHours;
                totalMonthlyPay += safeDailyPay;
                workDaysSet.add(dateKey);
              }
            }
          }
        }
      });
    });

    // 일별 통계를 날짜순으로 정렬하고, 각 날짜 내에서 직원들을 근무시작시간 기준으로 오름차순 정렬
    const sortedDailyStats = Object.values(dailyStatsMap).map(dayStat => ({
      ...dayStat,
      employees: dayStat.employees.sort((a, b) => {
        // 근무시작시간을 비교하여 오름차순 정렬
        const timeA = a.startTime;
        const timeB = b.startTime;
        return timeA.localeCompare(timeB);
      })
    })).sort((a, b) => new Date(a.date) - new Date(b.date));

    // 안전한 월별 총계 계산
    const safeTotalMonthlyHours = Number(totalMonthlyHours) || 0;
    const safeTotalMonthlyPay = Number(totalMonthlyPay) || 0;
    
    console.log('월별 총계 계산 결과:', {
      totalMonthlyHours: safeTotalMonthlyHours,
      totalMonthlyPay: safeTotalMonthlyPay,
      totalWorkDays: workDaysSet.size
    });
    
    return {
      dailyStats: sortedDailyStats,
      monthlyTotal: {
        totalHours: safeTotalMonthlyHours,
        totalPay: safeTotalMonthlyPay,
        totalWorkDays: workDaysSet.size
      }
    };
  };

  // 달력 생성을 위한 함수들
  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month - 1, 1).getDay();
  };

  // 주별 달력 생성 함수
  const generateWeeklyCalendar = () => {
    const [year, month] = filters.month.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    // 월의 첫 번째 월요일 찾기
    const firstMonday = new Date(startOfMonth);
    const dayOfWeek = startOfMonth.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    firstMonday.setDate(startOfMonth.getDate() + daysToMonday);
    
    const weeks = [];
    let currentWeek = 1;
    let currentDate = new Date(firstMonday);
    
    // 월 시작 전 주차 처리 (첫 주가 월 중간부터 시작하는 경우)
    if (firstMonday > startOfMonth) {
      const prevWeekStart = new Date(firstMonday);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      
      const prevWeek = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(prevWeekStart);
        date.setDate(date.getDate() + i);
        prevWeek.push({
          date: date.getDate(),
          fullDate: new Date(date),
          isCurrentMonth: date.getMonth() === month - 1,
          weekNumber: currentWeek
        });
      }
      weeks.push({ weekNumber: currentWeek, days: prevWeek });
      currentWeek++;
    }
    
    // 월 내의 주차들 생성
    while (currentDate <= endOfMonth || currentDate.getMonth() === month - 1) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + i);
        week.push({
          date: date.getDate(),
          fullDate: new Date(date),
          isCurrentMonth: date.getMonth() === month - 1,
          weekNumber: currentWeek
        });
      }
      weeks.push({ weekNumber: currentWeek, days: week });
      currentDate.setDate(currentDate.getDate() + 7);
      currentWeek++;
      
      // 다음 주가 완전히 다음 달인 경우 중단
      if (currentDate.getMonth() > month - 1) break;
    }
    
    return weeks;
  };

  const generateCalendar = () => {
    const [year, month] = filters.month.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const calendar = [];
    const weeks = [];
    
    // 빈 셀 추가 (월 시작 전)
    for (let i = 0; i < firstDay; i++) {
      weeks.push(null);
    }
    
    // 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      weeks.push(day);
    }
    
    // 주 단위로 분할
    for (let i = 0; i < weeks.length; i += 7) {
      calendar.push(weeks.slice(i, i + 7));
    }
    
    return calendar;
  };

  const getDayData = (day) => {
    if (!statistics || !day) return null;
    
    const dateStr = `${filters.month.split('-')[0]}-${filters.month.split('-')[1].padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return statistics.dailyStats.find(stat => stat.date === dateStr);
  };

  // 주별 달력용 날짜 데이터 가져오기 (변환된 데이터 사용)
  const getDayDataForWeekly = (dayObj) => {
    if (!statistics || !dayObj) return null;
    
    // 날짜 형식을 YYYY-MM-DD로 변환
    const year = dayObj.fullDate.getFullYear();
    const month = String(dayObj.fullDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayObj.fullDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayData = statistics.dailyStats.find(stat => stat.date === dateStr);
    
    // 디버깅용 로그
    if (dayData) {
      console.log('Found day data for:', dateStr, dayData);
    } else {
      console.log('No day data found for:', dateStr);
    }
    
    return dayData;
  };

  // 달력용 주차 목록 생성
  const getCalendarWeekOptions = () => {
    const weeklyCalendar = generateWeeklyCalendar();
    return weeklyCalendar.map(week => week.weekNumber);
  };

  // 선택된 주차에 따른 주별 달력 필터링
  const getFilteredWeeklyCalendar = () => {
    const weeklyCalendar = generateWeeklyCalendar();
    
    if (selectedCalendarWeek === 'all') {
      return weeklyCalendar;
    }
    
    return weeklyCalendar.filter(week => week.weekNumber === selectedCalendarWeek);
  };

  const getDayOfWeekColor = (dayIndex) => {
    if (dayIndex === 0) return '#ff6b6b'; // 일요일
    if (dayIndex === 6) return '#4ecdc4'; // 토요일
    return '#95a5a6'; // 평일
  };

  const handleDateClick = (day) => {
    const dayData = getDayData(day);
    if (dayData) {
      // 직원 데이터를 근무시작시간 기준으로 오름차순 정렬
      const sortedDayData = {
        ...dayData,
        employees: [...dayData.employees].sort((a, b) => {
          const timeA = a.startTime;
          const timeB = b.startTime;
          return timeA.localeCompare(timeB);
        })
      };
      
      setSelectedDate(day);
      setSelectedDateData(sortedDayData);
      setBottomDetailData(sortedDayData); // 하단 상세 정보 업데이트
    }
  };

  // 주별 달력용 날짜 클릭 핸들러
  const handleWeeklyDateClick = (dayObj, dayData) => {
    if (dayData && dayObj.isCurrentMonth) {
      console.log('Date clicked:', dayObj.date, dayData); // 디버깅용 로그
      
      // 직원 데이터를 근무시작시간 기준으로 오름차순 정렬
      const sortedDayData = {
        ...dayData,
        employees: [...dayData.employees].sort((a, b) => {
          const timeA = a.startTime;
          const timeB = b.startTime;
          return timeA.localeCompare(timeB);
        })
      };
      
      setSelectedDate(dayObj.date);
      setSelectedDateData(sortedDayData);
      setBottomDetailData(sortedDayData);
    }
  };

  const closeDetailDialog = () => {
    setSelectedDate(null);
    setSelectedDateData(null);
    setBottomDetailData(null); // 하단 상세 정보 닫기
  };

  // 주차 목록 생성 함수
  const getWeekOptions = () => {
    if (!weeklyStats || !weeklyStats.employeeWeeklyStats) return [];
    
    const weeks = new Set();
    Object.values(weeklyStats.employeeWeeklyStats).forEach(employeeWeeks => {
      Object.keys(employeeWeeks).forEach(weekKey => {
        const weekNumber = employeeWeeks[weekKey].weekNumber;
        weeks.add(weekNumber);
      });
    });
    
    return Array.from(weeks).sort((a, b) => a - b);
  };

  // 선택된 주차와 직원에 따른 데이터 필터링
  const getFilteredWeeklyStats = () => {
    if (!weeklyStats) return weeklyStats;
    
    const filteredStats = {
      ...weeklyStats,
      employeeWeeklyStats: {},
      monthlyTotals: {}
    };
    
    Object.keys(weeklyStats.employeeWeeklyStats).forEach(employeeName => {
      // 직원 필터링
      if (filters.selectedEmployee !== 'all' && employeeName !== filters.selectedEmployee) {
        return;
      }
      
      const employeeWeeks = weeklyStats.employeeWeeklyStats[employeeName];
      const filteredWeeks = {};
      
      Object.keys(employeeWeeks).forEach(weekKey => {
        // 주차 필터링
        if (selectedWeek === 'all' || employeeWeeks[weekKey].weekNumber === selectedWeek) {
          // employeeId는 이미 weekData에 포함되어 있음
          filteredWeeks[weekKey] = employeeWeeks[weekKey];
        }
      });
      
      if (Object.keys(filteredWeeks).length > 0) {
        filteredStats.employeeWeeklyStats[employeeName] = filteredWeeks;
        
        // 선택된 주차의 총계 계산
        if (selectedWeek === 'all') {
          // 전체 주차의 총계
          const totalHours = Object.values(filteredWeeks).reduce((sum, week) => sum + week.totalHours, 0);
          const totalPay = Object.values(filteredWeeks).reduce((sum, week) => sum + week.totalPay, 0);
          const totalHolidayPay = 0;
          const totalGrossPay = Object.values(filteredWeeks).reduce((sum, week) => sum + week.weeklyTotal, 0);
          const totalWorkDays = Object.values(filteredWeeks).reduce((sum, week) => sum + week.workDays, 0);
          
          // 주 15시간 미만 근무자는 세금 면제
          const weeklyAvgHours = totalHours / Object.keys(filteredWeeks).length || 0;
          const isTaxExempt = weeklyAvgHours < 15;
          const taxAmount = isTaxExempt ? 0 : Math.round(totalGrossPay * 0.033);
          
          filteredStats.monthlyTotals[employeeName] = {
            totalHours,
            totalPay,
            totalHolidayPay,
            totalGrossPay,
            taxAmount: taxAmount,
            netPay: totalGrossPay - taxAmount,
            workDays: totalWorkDays,
            taxInfo: {
              incomeTax: isTaxExempt ? 0 : Math.round(taxAmount * 0.9),
              localTax: isTaxExempt ? 0 : Math.round(taxAmount * 0.1),
              totalTax: taxAmount,
              netPay: totalGrossPay - taxAmount
            }
          };
        } else {
          // 선택된 주차의 총계
          const weekData = Object.values(filteredWeeks)[0];
          
          // 주 15시간 미만 근무자는 세금 면제
          const isTaxExempt = weekData.totalHours < 15;
          const taxAmount = isTaxExempt ? 0 : Math.round(weekData.weeklyTotal * 0.033);
          
          filteredStats.monthlyTotals[employeeName] = {
            totalHours: weekData.totalHours,
            totalPay: weekData.totalPay,
            totalHolidayPay: 0,
            totalGrossPay: weekData.weeklyTotal,
            taxAmount: taxAmount,
            netPay: weekData.weeklyTotal - taxAmount,
            workDays: weekData.workDays,
            taxInfo: {
              incomeTax: isTaxExempt ? 0 : Math.round(taxAmount * 0.9),
              localTax: isTaxExempt ? 0 : Math.round(taxAmount * 0.1),
              totalTax: taxAmount,
              netPay: weekData.weeklyTotal - taxAmount
            }
          };
        }
      }
    });
    
    return filteredStats;
  };

  // 월별 급여 확정 함수
  const handleConfirmMonthlySalary = async () => {
    if (!weeklyStats || !selectedStoreId) return;

    setConfirmLoading(true);
    try {
      const [year, month] = filters.month.split('-');
      
      // 주차별 통계 데이터를 월별 급여 확정 형식으로 변환
      const employeeData = Object.keys(weeklyStats.employeeWeeklyStats).map(employeeName => {
        const employeeWeeks = weeklyStats.employeeWeeklyStats[employeeName];
        const monthlyTotal = weeklyStats.monthlyTotals[employeeName];
        
        // 주차별 상세 정보 생성
        const weeklyDetails = Object.keys(employeeWeeks).map(weekKey => {
          const week = employeeWeeks[weekKey];
          return {
            weekNumber: week.weekNumber,
            startDate: week.startDate,
            endDate: week.endDate,
            workHours: week.totalHours,
            workDays: week.workDays,
            basePay: week.totalPay,
            holidayPay: 0,
            weeklyTotal: week.weeklyTotal
          };
        });

        // 첫 번째 주차에서 직원 정보 가져오기
        const firstWeek = Object.values(employeeWeeks)[0];
        const employee = employees.find(emp => emp.username === employeeName) || {};

        return {
          userId: employee._id,
          employeeName,
          employeeEmail: employee.email || '',
          hourlyWage: firstWeek.hourlyWage || 0,
          taxType: employee.taxType || '미신고',
          totalWorkHours: monthlyTotal.totalHours,
          totalWorkDays: monthlyTotal.workDays,
          totalBasePay: monthlyTotal.totalPay,
          totalHolidayPay: 0,
          totalGrossPay: monthlyTotal.totalGrossPay,
          taxInfo: monthlyTotal.taxInfo || {
            incomeTax: 0,
            localTax: 0,
            totalTax: 0,
            netPay: monthlyTotal.totalGrossPay
          },
          weeklyDetails
        };
      });

      const result = await monthlySalaryService.confirmMonthlySalary(
        selectedStoreId,
        parseInt(year),
        parseInt(month),
        employeeData
      );

      setSnackbarMessage(`${result.savedCount}명의 급여가 확정되었습니다.`);
      setSnackbarOpen(true);
      setConfirmDialogOpen(false);

    } catch (error) {
      console.error('월별 급여 확정 오류:', error);
      setSnackbarMessage(error.message || '급여 확정 중 오류가 발생했습니다.');
      setSnackbarOpen(true);
    } finally {
      setConfirmLoading(false);
    }
  };

  // 엑셀 다운로드 함수
  const handleDownloadExcel = async () => {
    if (!selectedStoreId) return;

    setExcelLoading(true);
    try {
      const [year, month] = filters.month.split('-');
      
      await monthlySalaryService.downloadMonthlySalaryExcel(
        selectedStoreId,
        parseInt(year),
        parseInt(month)
      );

      setSnackbarMessage('엑셀 파일이 다운로드되었습니다.');
      setSnackbarOpen(true);

    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      setSnackbarMessage(error.message || '엑셀 다운로드 중 오류가 발생했습니다.');
      setSnackbarOpen(true);
    } finally {
      setExcelLoading(false);
    }
  };

  // 주휴수당 산출 핸들러
  const handleCalculateHolidayPay = async (employeeId, weekKey) => {
    try {
      const [year, month] = filters.month.split('-');
      const apiUrl = `${API_BASE}/monthly-salary/calculate-holiday-pay`;
      
      console.log('주휴수당 산출 API 호출:', {
        url: apiUrl,
        employeeId,
        weekKey,
        year,
        month
      });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          employeeId,
          weekKey,
          year: parseInt(year),
          month: parseInt(month)
        })
      });
      
      if (response.ok) {
        setSnackbarMessage('주휴수당이 산출되었습니다.');
        setSnackbarOpen(true);
        fetchStatistics(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        setSnackbarMessage(errorData.message || '주휴수당 산출에 실패했습니다.');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('주휴수당 산출 오류:', error);
      setSnackbarMessage('주휴수당 산출 중 오류가 발생했습니다.');
      setSnackbarOpen(true);
    }
  };

  // 주휴수당 수정 핸들러
  const handleEditHolidayPay = (employeeId, weekKey, weekData) => {
    setEditDialogData({ employeeId, weekKey, weekData });
    setAdjustedAmount(weekData.holidayPay || 0);
    setAdjustmentReason(weekData.holidayPayCalculation?.adjusted?.reason || '');
    setAdjustmentNotes(weekData.holidayPayCalculation?.adjusted?.notes || '');
    setEditDialogOpen(true);
  };

  // 주휴수당 수정 저장 핸들러
  const handleSaveHolidayPayAdjustment = async () => {
    if (!editDialogData) return;
    
    try {
      const [year, month] = filters.month.split('-');
      
      const response = await fetch(`${API_BASE}/monthly-salary/adjust-holiday-pay`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          employeeId: editDialogData.employeeId,
          weekKey: editDialogData.weekKey,
          adjustedAmount,
          reason: adjustmentReason,
          notes: adjustmentNotes,
          year: parseInt(year),
          month: parseInt(month)
        })
      });
      
      if (response.ok) {
        setSnackbarMessage('주휴수당이 수정되었습니다.');
        setSnackbarOpen(true);
        setEditDialogOpen(false);
        fetchStatistics(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        setSnackbarMessage(errorData.message || '주휴수당 수정에 실패했습니다.');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('주휴수당 수정 오류:', error);
      setSnackbarMessage('주휴수당 수정 중 오류가 발생했습니다.');
      setSnackbarOpen(true);
    }
  };

  // 주휴수당 확정 핸들러
  const handleConfirmHolidayPay = async (employeeId, weekKey) => {
    try {
      const [year, month] = filters.month.split('-');
      
      const response = await fetch(`${API_BASE}/monthly-salary/confirm-holiday-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          employeeId,
          weekKey,
          year: parseInt(year),
          month: parseInt(month)
        })
      });
      
      if (response.ok) {
        setSnackbarMessage('주휴수당이 확정되었습니다.');
        setSnackbarOpen(true);
        fetchStatistics(); // 데이터 새로고침
      } else {
        const errorData = await response.json();
        setSnackbarMessage(errorData.message || '주휴수당 확정에 실패했습니다.');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('주휴수당 확정 오류:', error);
      setSnackbarMessage('주휴수당 확정 중 오류가 발생했습니다.');
      setSnackbarOpen(true);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const calendar = generateCalendar();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        근무 통계
      </Typography>

      {/* 점포 선택 */}
      <Box sx={{ mb: 3 }}>
        <StoreSelector />
      </Box>

      {/* 필터 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>월</InputLabel>
              <Select
                value={filters.month}
                label="월"
                onChange={(e) => handleFilterChange('month', e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - i);
                  const value = date.toISOString().slice(0, 7);
                  const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
                  return { value, label };
                }).map((month) => (
                  <MenuItem key={month.value} value={month.value}>
                    {month.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>직원</InputLabel>
              <Select
                value={filters.selectedEmployee}
                label="직원"
                onChange={(e) => handleFilterChange('selectedEmployee', e.target.value)}
              >
                <MenuItem value="all">전체 직원</MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee._id} value={employee.username}>
                    {employee.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExcelDownload}
              disabled={excelLoading}
              sx={{ height: 56 }}
              fullWidth
            >
              {excelLoading ? '다운로드 중...' : '임금신고 엑셀 다운로드'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 탭 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
          <Tab label="달력 보기" />
          <Tab label="직원별 주차 통계" />
        </Tabs>
      </Paper>

      {statistics && (
        <>
          {tabValue === 0 && (
            <>
              {/* 월별 요약 */}
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        총 근무 시간
                      </Typography>
                      <Typography variant="h4">
                        {formatHours(statistics.monthlyTotal.totalHours)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        총 급여
                      </Typography>
                      <Typography variant="h4">
                        {formatCurrency(statistics.monthlyTotal.totalPay)}원
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        근무 일수
                      </Typography>
                      <Typography variant="h4">
                        {statistics.monthlyTotal.totalWorkDays}일
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* 달력 */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    주별 근무 달력 - {currentStoreName}
                  </Typography>
                  
                  {statistics && (
                    <FormControl sx={{ minWidth: 150 }}>
                      <InputLabel>주차 선택</InputLabel>
                      <Select
                        value={selectedCalendarWeek}
                        label="주차 선택"
                        onChange={(e) => setSelectedCalendarWeek(e.target.value)}
                      >
                        <MenuItem value="all">전체 주차</MenuItem>
                        {getCalendarWeekOptions().map((weekNum) => (
                          <MenuItem key={weekNum} value={weekNum}>
                            {weekNum}주차
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
                
                {/* 요일 헤더 */}
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
                    <Grid item xs key={day} sx={{ width: '14.28%' }}>
                      <Box
                        sx={{
                          textAlign: 'center',
                          py: 1,
                          backgroundColor: getDayOfWeekColor((index + 1) % 7), // 월요일부터 시작하도록 조정
                          color: 'white',
                          borderRadius: 1,
                          fontWeight: 'bold'
                        }}
                      >
                        {day}
                      </Box>
                    </Grid>
                  ))}
                </Grid>

                {/* 주별 달력 */}
                {getFilteredWeeklyCalendar().map((week, weekIndex) => (
                  <Box key={`week-${week.weekNumber}`} sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
                      {week.weekNumber}주차
                    </Typography>
                    
                    <Grid container spacing={1}>
                      {week.days.map((dayObj, dayIndex) => {
                        const dayData = getDayDataForWeekly(dayObj);
                        const isToday = dayObj.fullDate.toDateString() === new Date().toDateString();
                        
                        // 달력 렌더링 디버깅용 로그
                        if (dayData) {
                          console.log('Calendar rendering for:', dayObj.date, 'Data:', dayData);
                        }
                        
                        return (
                          <Grid item xs key={dayIndex} sx={{ width: '14.28%' }}>
                            <Card
                              sx={{
                                height: isMobile ? 120 : 200, // 모바일에서 높이 줄이기
                                minHeight: isMobile ? 120 : 200,
                                maxHeight: isMobile ? 120 : 200,
                                backgroundColor: dayObj.isCurrentMonth ? 'white' : 'grey.100',
                                border: isToday ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                opacity: dayObj.isCurrentMonth ? 1 : 0.5,
                                cursor: dayData ? 'pointer' : 'default',
                                '&:hover': dayData ? { backgroundColor: '#f5f5f5' } : {},
                                overflow: 'hidden' // 내용이 넘칠 때 숨김
                              }}
                              onClick={() => handleWeeklyDateClick(dayObj, dayData)}
                            >
                              <CardContent sx={{ p: 0.8, '&:last-child': { pb: 0.8 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <Typography 
                                  variant="subtitle2" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    color: dayIndex === 5 ? '#4ecdc4' : dayIndex === 6 ? '#ff6b6b' : 'text.primary', // 토요일, 일요일 색상
                                    mb: 1
                                  }}
                                >
                                  {dayObj.date}
                                </Typography>
                                
                                {dayData && (
                                  <Stack spacing={0.2} sx={{ flex: 1, justifyContent: 'space-between' }}>
                                    {dayData.employees
                                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                      .slice(0, isMobile ? 2 : 3) // 모바일에서는 2개만 표시
                                      .map((employee, empIndex) => (
                                        <Typography 
                                          key={empIndex}
                                          variant="caption" 
                                          display="block" 
                                          sx={{ 
                                            fontSize: isMobile ? '0.5rem' : '0.6rem',
                                            color: 'text.primary',
                                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                            px: 0.3,
                                            py: 0.1,
                                            borderRadius: 0.3,
                                            textAlign: 'center',
                                            lineHeight: 1.2,
                                            whiteSpace: 'nowrap', // 한 줄로 표시
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                          }}
                                        >
                                          {isMobile ? (
                                            `${employee.name} ${formatHours(employee.workHours)}`
                                          ) : (
                                            `${employee.name} ${employee.startTime}-${employee.endTime} ${formatHours(employee.workHours)}`
                                          )}
                                        </Typography>
                                      ))}
                                    
                                    {dayData.employees.length > (isMobile ? 2 : 3) && (
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          fontSize: isMobile ? '0.45rem' : '0.55rem', 
                                          color: 'primary.main', 
                                          textAlign: 'center',
                                          fontWeight: 'bold',
                                          py: 0.1
                                        }}
                                      >
                                        +{dayData.employees.length - (isMobile ? 2 : 3)}명
                                      </Typography>
                                    )}
                                    
                                    <Divider sx={{ my: 0.2 }} />
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontSize: '0.55rem', 
                                        fontWeight: 'bold', 
                                        color: 'primary.main', 
                                        textAlign: 'center',
                                        py: 0.1
                                      }}
                                    >
                                      총 {formatHours(dayData.totalHours)}
                                    </Typography>
                                  </Stack>
                                )}
                              </CardContent>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>
                ))}
              </Paper>

              {/* 선택된 날짜 상세 정보 */}
              {bottomDetailData && (
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      {selectedDate}일 근무 상세 정보
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={() => setBottomDetailData(null)}
                    >
                      닫기
                    </Button>
                  </Box>
                  
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>근로자</TableCell>
                          <TableCell align="center">근무 시작시간</TableCell>
                          <TableCell align="center">근무 종료시간</TableCell>
                          <TableCell align="right">시급</TableCell>
                          <TableCell align="right">총 근로시간</TableCell>
                          <TableCell align="right">급여</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {bottomDetailData.employees.map((employee, index) => {
                          // 시급 계산 (0으로 나누는 경우 방지)
                          const hourlyWage = employee.workHours > 0 
                            ? Math.round(employee.pay / employee.workHours)
                            : 0;
                          
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold">
                                  {employee.name}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {employee.startTime}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Typography variant="body2">
                                  {employee.endTime}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {formatCurrency(hourlyWage)}원
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold">
                                  {formatHours(employee.workHours)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {formatCurrency(employee.pay)}원
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        
                        {/* 합계 행 */}
                        <TableRow sx={{ backgroundColor: 'grey.50' }}>
                          <TableCell colSpan={4}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              일별 합계
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight="bold">
                              {formatHours(bottomDetailData.totalHours)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" fontWeight="bold">
                              {formatCurrency(bottomDetailData.totalPay)}원
                            </Typography>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}
            </>
          )}

          {tabValue === 1 && (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  직원별 주차 통계 - {currentStoreName}
                  {filters.selectedEmployee !== 'all' && ` (${filters.selectedEmployee})`}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {/* 급여 확정 버튼 */}
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => setConfirmDialogOpen(true)}
                    disabled={!weeklyStats || Object.keys(weeklyStats.employeeWeeklyStats || {}).length === 0}
                  >
                    급여 확정
                  </Button>
                  
                  {/* 엑셀 다운로드 버튼 */}
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadExcel}
                    disabled={excelLoading}
                  >
                    {excelLoading ? '다운로드 중...' : '엑셀 다운로드'}
                  </Button>
                  {weeklyStats && getWeekOptions().length > 0 && (
                    <FormControl sx={{ minWidth: 150 }}>
                      <InputLabel>주차 선택</InputLabel>
                      <Select
                        value={selectedWeek}
                        label="주차 선택"
                        onChange={(e) => setSelectedWeek(e.target.value)}
                      >
                        <MenuItem value="all">전체 주차</MenuItem>
                        {getWeekOptions().map((weekNum) => (
                          <MenuItem key={weekNum} value={weekNum}>
                            {weekNum}주차
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Box>
              </Box>
              
              {!weeklyStats ? (
                <Alert severity="info">주차별 통계 데이터를 불러오는 중입니다...</Alert>
              ) : Object.keys(weeklyStats.employeeWeeklyStats || {}).length === 0 ? (
                <Alert severity="info">해당 기간에 승인된 근무 기록이 없습니다.</Alert>
              ) : (
                <Box>
                  {(() => {
                    const filteredStats = getFilteredWeeklyStats();
                    return Object.keys(filteredStats.employeeWeeklyStats).map((employeeName) => {
                      const employeeWeeks = filteredStats.employeeWeeklyStats[employeeName];
                      const monthlyTotal = filteredStats.monthlyTotals[employeeName];
                      
                      return (
                        <Box key={employeeName} sx={{ mb: 4 }}>
                          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            {employeeName}
                          </Typography>
                          
                          <TableContainer component={Paper} sx={{ mb: 2 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>주차</TableCell>
                                  <TableCell align="center">기간</TableCell>
                                  <TableCell align="right">근로시간</TableCell>
                                  <TableCell align="right">근무일수</TableCell>
                                  <TableCell align="right">시급</TableCell>
                                  <TableCell align="right">주급여</TableCell>
                                  <TableCell align="right">주휴수당</TableCell>
                                  <TableCell align="right">주 총액</TableCell>
                                  <TableCell align="center">작업</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.keys(employeeWeeks)
                                  .sort((a, b) => parseInt(a) - parseInt(b))
                                  .map((weekKey) => {
                                    const weekData = employeeWeeks[weekKey];
                                    const startDate = new Date(weekData.startDate).toLocaleDateString('ko-KR', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    });
                                    const endDate = new Date(weekData.endDate).toLocaleDateString('ko-KR', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    });
                                    
                                    return (
                                      <TableRow key={weekKey}>
                                        <TableCell>
                                          <Typography variant="subtitle1" fontWeight="bold">
                                            {weekData.weekNumber}주차
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                          <Typography variant="body2">
                                            {startDate} ~ {endDate}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography variant="body2" fontWeight="bold">
                                            {formatHours(weekData.totalHours)}
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography variant="body2">
                                            {weekData.workDays}일
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography variant="body2">
                                            {formatCurrency(weekData.hourlyWage)}원
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography variant="body2">
                                            {formatCurrency(weekData.totalPay)}원
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography 
                                            variant="body2" 
                                            fontWeight="bold" 
                                            color={weekData.holidayPayStatus === 'adjusted' ? 'warning.main' : 'primary'}
                                          >
                                            {formatCurrency(weekData.holidayPay || 0)}원
                                          </Typography>
                                          {weekData.holidayPayStatus === 'adjusted' && (
                                            <Typography variant="caption" color="text.secondary" display="block">
                                              (수정됨)
                                            </Typography>
                                          )}
                                        </TableCell>
                                        <TableCell align="right">
                                          <Typography variant="body2" fontWeight="bold" color="primary">
                                            {formatCurrency(weekData.weeklyTotal)}원
                                          </Typography>
                                        </TableCell>
                                        <TableCell align="center">
                                          <Stack direction="row" spacing={1}>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              onClick={() => handleCalculateHolidayPay(weekData.employeeId, weekData.startDate)}
                                              disabled={weekData.holidayPayStatus === 'confirmed'}
                                            >
                                              산출
                                            </Button>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              onClick={() => handleEditHolidayPay(weekData.employeeId, weekData.startDate, weekData)}
                                              disabled={weekData.holidayPayStatus === 'not_calculated'}
                                            >
                                              수정
                                            </Button>
                                            <Button
                                              size="small"
                                              variant="contained"
                                              color="success"
                                              onClick={() => handleConfirmHolidayPay(weekData.employeeId, weekData.startDate)}
                                              disabled={weekData.holidayPayStatus === 'confirmed'}
                                            >
                                              확정
                                            </Button>
                                          </Stack>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                          
                          {/* 월별 총계 */}
                          <Card sx={{ backgroundColor: '#f8f9fa' }}>
                            <CardContent>
                              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                {selectedWeek === 'all' ? '월별 총계' : `${selectedWeek}주차 총계`}
                              </Typography>
                              <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">총 근무시간</Typography>
                                  <Typography variant="h6">{formatHours(monthlyTotal.totalHours)}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">총 급여</Typography>
                                  <Typography variant="h6">{formatCurrency(monthlyTotal.totalPay)}원</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">총 주휴수당</Typography>
                                  <Typography variant="h6" color="primary">{formatCurrency(monthlyTotal.totalHolidayPay || 0)}원</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">총 지급액</Typography>
                                  <Typography variant="h6" color="primary">{formatCurrency(monthlyTotal.totalGrossPay)}원</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">세금 (3.3%)</Typography>
                                  <Typography variant="h6" color="error">{formatCurrency(monthlyTotal.taxAmount)}원</Typography>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Typography variant="body2" color="text.secondary">실제 수령액</Typography>
                                  <Typography variant="h6" color="success.main" fontWeight="bold">
                                    {formatCurrency(monthlyTotal.netPay)}원
                                  </Typography>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Box>
                      );
                    });
                  })()}
                </Box>
              )}
            </Paper>
          )}
        </>
      )}

      {/* 급여 확정 다이얼로그 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>월별 급여 확정</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {filters.month} 월의 급여를 확정하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            확정된 급여는 엑셀 파일로 다운로드할 수 있으며, 급여명세서 발급에 사용됩니다.
          </Typography>
          {weeklyStats && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              대상 직원: {Object.keys(weeklyStats.employeeWeeklyStats || {}).length}명
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialogOpen(false)}
            disabled={confirmLoading}
          >
            취소
          </Button>
          <Button 
            onClick={handleConfirmMonthlySalary}
            variant="contained"
            disabled={confirmLoading}
          >
            {confirmLoading ? '확정 중...' : '확정'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      {/* 주휴수당 수정 다이얼로그 */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>주휴수당 수정</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="주휴수당 (원)"
              type="number"
              value={adjustedAmount}
              onChange={(e) => setAdjustedAmount(parseInt(e.target.value) || 0)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="수정 사유"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="메모"
              multiline
              rows={3}
              value={adjustmentNotes}
              onChange={(e) => setAdjustmentNotes(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>취소</Button>
          <Button onClick={handleSaveHolidayPayAdjustment} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Statistics; 