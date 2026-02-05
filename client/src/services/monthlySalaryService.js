import api from '../utils/api';

const monthlySalaryService = {
  // 월별 급여 확정
  confirmMonthlySalary: async (storeId, year, month, employeeData) => {
    try {
      const response = await api.post('/monthly-salary/confirm', {
        storeId,
        year,
        month,
        employeeData
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // 확정된 월별 급여 목록 조회
  getMonthlySalaries: async (storeId, year, month) => {
    try {
      const response = await api.get('/monthly-salary', {
        params: { storeId, year, month }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // 월별 급여 엑셀 다운로드
  downloadMonthlySalaryExcel: async (storeId, year, month) => {
    try {
      const response = await api.get('/monthly-salary/excel', {
        params: { storeId, year, month },
        responseType: 'blob'
      });

      // Blob으로 파일 다운로드
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // 파일명 설정
      const filename = `급여명세서_${year}년${month}월_${new Date().getTime()}.xlsx`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true, message: '엑셀 파일이 다운로드되었습니다.' };
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default monthlySalaryService; 