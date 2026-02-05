import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ko } from 'date-fns/locale';
import {
  fetchExpenseByMonth,
  saveExpenseData,
  addExpenseItem,
  updateExpenseItem,
  deleteExpenseItem,
  addIncomeItem,
  updateIncomeItem,
  deleteIncomeItem,
  fetchAnnualStats,
  fetchLaborCost,
  setSelectedYear,
  setSelectedMonth,
  clearError
} from '../../store/slices/expenseSlice';
import {
  fetchApplicableFixedExpenses
} from '../../store/slices/fixedExpenseSlice';
import { StoreSelector } from '../../components/common';
import { useStoreSelection } from '../../hooks/useMeta';
import { formatCurrency } from '../../utils/formatters';

// 상수 정의
const EXPENSE_CATEGORIES = [
  '인건비', '임대료', '수도광열비', '전기세', '보험료', '세금', '직접입력'
];

const PAYMENT_METHODS = [
  '카드', '계좌이체', '현금', '기타'
];

const INCOME_CATEGORIES = [
  '월 정산', '부가 수입', '임대 수입', '기타 수입', '보조금', '환급금', '기타'
];

/**
 * 날짜 선택 컴포넌트
 */
const DateSelector = ({ selectedYear, selectedMonth, onYearChange, onMonthChange }) => (
  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ko}>
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel>연도</InputLabel>
          <Select
            value={selectedYear}
            label="연도"
            onChange={(e) => onYearChange(e.target.value)}
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
              <MenuItem key={year} value={year}>{year}년</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={6}>
        <FormControl fullWidth>
          <InputLabel>월</InputLabel>
          <Select
            value={selectedMonth}
            label="월"
            onChange={(e) => onMonthChange(e.target.value)}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <MenuItem key={month} value={month}>{month}월</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  </LocalizationProvider>
);

/**
 * 수익률 정보 카드 컴포넌트
 */
const ProfitabilityCard = ({ currentExpense }) => {
  // 수입/지출 데이터 계산
  const calculateProfitability = () => {
    if (!currentExpense) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0
      };
    }

    // 수입 항목들의 총합 계산
    const totalIncome = (currentExpense.incomeItems || []).reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);

    // 지출 항목들의 총합 계산
    const totalExpenses = (currentExpense.expenses || []).reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);

    // 순이익 계산
    const netProfit = totalIncome - totalExpenses;

    // 수익률 계산 (총 수입이 0이 아닌 경우에만)
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin
    };
  };

  const { totalIncome, totalExpenses, netProfit, profitMargin } = calculateProfitability();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          최종 수익률 정보
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">총 수입</Typography>
            <Typography variant="h6" color="success.main">
              {formatCurrency(totalIncome)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">총 지출</Typography>
            <Typography variant="h6" color="error.main">
              {formatCurrency(totalExpenses)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">순이익</Typography>
            <Typography variant="h6" color={netProfit >= 0 ? 'success.main' : 'error.main'}>
              {formatCurrency(netProfit)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">수익률</Typography>
            <Typography variant="h6" color={profitMargin >= 0 ? 'success.main' : 'error.main'}>
              {profitMargin.toFixed(2)}%
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

/**
 * 수입/지출 항목 테이블 컴포넌트
 */
const ItemTable = ({ 
  title, 
  items, 
  onAdd, 
  onEdit, 
  onDelete, 
  categories,
  type 
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{title}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => onAdd(type)}
          size="small"
        >
          항목 추가
        </Button>
      </Box>
      
      {items && items.length > 0 ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>항목</TableCell>
                <TableCell align="right">금액</TableCell>
                {type === 'expense' && <TableCell align="center" sx={{ fontSize: '0.75rem' }}>방법</TableCell>}
                <TableCell align="center">작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2">{item.category}</Typography>
                      {item.notes && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {item.notes}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                  {type === 'expense' && (
                    <TableCell align="center">
                      {item.paymentMethod ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {item.paymentMethod === '카드' ? '카드' : 
                           item.paymentMethod === '계좌이체' ? '이체' : 
                           item.paymentMethod === '현금' ? '현금' : 
                           item.paymentMethod === '기타' ? '기타' : item.paymentMethod}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.disabled" sx={{ fontSize: '0.75rem' }}>
                          -
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => onEdit(type, index, item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => onDelete(type, index)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box textAlign="center" py={3}>
          <Typography variant="body2" color="text.secondary">
            {type === 'income' ? '수입' : '지출'} 항목이 없습니다
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

/**
 * 항목 추가/수정 다이얼로그 컴포넌트
 */
const ItemDialog = ({ 
  open, 
  onClose, 
  item, 
  onSave, 
  categories, 
  type 
}) => {
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    paymentMethod: '카드',
    notes: ''
  });
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        category: item.category || '',
        amount: item.amount?.toString() || '',
        paymentMethod: item.paymentMethod || '카드',
        notes: item.notes || ''
      });
      setCustomCategory(item.category || '');
    } else {
      setFormData({
        category: '',
        amount: '',
        paymentMethod: '카드',
        notes: ''
      });
      setCustomCategory('');
    }
  }, [item]);

  const handleCategoryChange = (value) => {
    if (value === '직접입력') {
      setFormData({ ...formData, category: customCategory || '' });
    } else {
      setFormData({ ...formData, category: value });
      setCustomCategory(value);
    }
  };

  const handleSave = () => {
    if (!formData.category || !formData.amount) {
      alert('항목과 금액을 입력해주세요.');
      return;
    }
    if (type === 'expense' && !formData.paymentMethod) {
      alert('지출방법을 선택해주세요.');
      return;
    }
    onSave({
      ...formData,
      amount: parseFloat(formData.amount)
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {item ? `${type === 'income' ? '수입' : '지출'} 항목 수정` : `${type === 'income' ? '수입' : '지출'} 항목 추가`}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>항목</InputLabel>
            <Select
              value={categories.includes(formData.category) ? formData.category : '직접입력'}
              label="항목"
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {categories.map(category => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {(formData.category === '직접입력' || (formData.category && !categories.includes(formData.category))) && (
            <TextField
              fullWidth
              label="직접 입력"
              value={customCategory}
              onChange={(e) => {
                setCustomCategory(e.target.value);
                setFormData({ ...formData, category: e.target.value });
              }}
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            fullWidth
            label="금액"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            InputProps={{
              startAdornment: <Typography variant="body2" sx={{ mr: 1 }}>₩</Typography>
            }}
            sx={{ mb: 2 }}
          />

          {type === 'expense' && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>지출방법</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="지출방법"
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map(method => (
                  <MenuItem key={method} value={method}>{method}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            fullWidth
            label="비고"
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="세부사항을 입력하세요..."
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleSave} variant="contained">저장</Button>
      </DialogActions>
    </Dialog>
  );
};

/**
 * 메인 비용 관리 컴포넌트
 */
const ExpenseManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // Redux 상태
  const {
    currentExpense,
    error,
    selectedYear,
    selectedMonth,
    loading
  } = useSelector(state => state.expense);
  
  // 점포 선택 훅
  const { stores, selectedStoreId, fetchStores } = useStoreSelection();
  const { user } = useSelector(state => state.auth);

  // 로컬 상태
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingType, setEditingType] = useState('');

  // 데이터 로드
  useEffect(() => {
    if (user?.role === 'owner') {
      fetchStores();
    }
  }, [user, fetchStores]); // 메모이제이션된 함수이므로 안전하게 의존성 배열에 추가

  useEffect(() => {
    if (selectedStoreId && selectedYear && selectedMonth) {
      dispatch(fetchExpenseByMonth({ year: selectedYear, month: selectedMonth, storeId: selectedStoreId }));
      dispatch(fetchLaborCost({ year: selectedYear, month: selectedMonth, storeId: selectedStoreId }));
      dispatch(fetchAnnualStats({ year: selectedYear, storeId: selectedStoreId }));
      dispatch(fetchApplicableFixedExpenses({ year: selectedYear, month: selectedMonth, storeId: selectedStoreId }));
    }
  }, [dispatch, selectedStoreId, selectedYear, selectedMonth]);

  // 초기 데이터 설정
  useEffect(() => {
    if (currentExpense) {
      setNotes(currentExpense.notes || '');
    }
  }, [currentExpense]);

  // 핸들러 함수들
  const handleYearChange = (year) => {
    dispatch(setSelectedYear(year));
  };

  const handleMonthChange = (month) => {
    dispatch(setSelectedMonth(month));
  };

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
  };

  const handleSaveNotes = () => {
    if (currentExpense && selectedStoreId) {
      dispatch(saveExpenseData({
        year: selectedYear,
        month: selectedMonth,
        storeId: selectedStoreId,
        data: {
          ...currentExpense,
          notes
        }
      }));
      setIsEditingNotes(false);
    }
  };

  const handleAddItem = (type) => {
    setEditingType(type);
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEditItem = (type, index, item) => {
    setEditingType(type);
    setEditingItem({ ...item, index });
    setDialogOpen(true);
  };

  const handleDeleteItem = (type, index) => {
    if (window.confirm('이 항목을 삭제하시겠습니까?')) {
      if (type === 'income') {
        dispatch(deleteIncomeItem({ 
          year: selectedYear,
          month: selectedMonth,
          incomeId: index, 
          storeId: selectedStoreId 
        }));
      } else {
        dispatch(deleteExpenseItem({ 
          year: selectedYear,
          month: selectedMonth,
          expenseId: index, 
          storeId: selectedStoreId 
        }));
      }
    }
  };

  const handleSaveItem = (itemData) => {
    // 필수 필드 추가
    const enrichedItemData = {
      ...itemData,
      description: itemData.description || itemData.category,
      date: itemData.date || new Date(),
      paymentMethod: itemData.paymentMethod || '카드',
      notes: itemData.notes || ''
    };

    if (editingItem) {
      // 수정
      if (editingType === 'income') {
        dispatch(updateIncomeItem({ 
          year: selectedYear,
          month: selectedMonth,
          incomeId: editingItem.index, 
          incomeItem: enrichedItemData, 
          storeId: selectedStoreId 
        }));
      } else {
        dispatch(updateExpenseItem({ 
          year: selectedYear,
          month: selectedMonth,
          expenseId: editingItem.index, 
          updateData: enrichedItemData, 
          storeId: selectedStoreId 
        }));
      }
    } else {
      // 추가
      if (editingType === 'income') {
        dispatch(addIncomeItem({ 
          year: selectedYear,
          month: selectedMonth,
          incomeItem: enrichedItemData, 
          storeId: selectedStoreId 
        }));
      } else {
        dispatch(addExpenseItem({ 
          year: selectedYear,
          month: selectedMonth,
          expenseItem: enrichedItemData, 
          storeId: selectedStoreId 
        }));
      }
    }
  };

  // 점포가 선택되지 않은 경우
  if (!selectedStoreId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          비용 관리
        </Typography>
        
        <StoreSelector />
        
        {stores.length === 0 && !loading && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            등록된 점포가 없습니다. 
            <Button 
              color="inherit" 
              onClick={() => navigate('/owner/store-management')}
              sx={{ ml: 1 }}
            >
              점포 관리
            </Button>
            에서 점포를 등록해주세요.
          </Alert>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        )}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        비용 관리
      </Typography>

      {/* 점포 선택 */}
      <Box sx={{ mb: 3 }}>
        <StoreSelector />
      </Box>

      {/* 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* 날짜 선택 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            기간 선택
          </Typography>
          <DateSelector
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={handleYearChange}
            onMonthChange={handleMonthChange}
          />
        </CardContent>
      </Card>

      {/* 수입/지출 항목 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <ItemTable
            title="수입 내역"
            items={currentExpense?.incomeItems || []}
            onAdd={handleAddItem}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            categories={INCOME_CATEGORIES}
            type="income"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ItemTable
            title="지출 내역"
            items={currentExpense?.expenses || []}
            onAdd={handleAddItem}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            categories={EXPENSE_CATEGORIES}
            type="expense"
          />
        </Grid>
      </Grid>

      {/* 수익률 정보 */}
      <ProfitabilityCard currentExpense={currentExpense} />

      {/* 메모 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">메모</Typography>
            {!isEditingNotes ? (
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => setIsEditingNotes(true)}
                size="small"
              >
                수정
              </Button>
            ) : (
              <Box>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveNotes}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  저장
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={() => {
                    setIsEditingNotes(false);
                    setNotes(currentExpense?.notes || '');
                  }}
                  size="small"
                >
                  취소
                </Button>
              </Box>
            )}
          </Box>
          
          {isEditingNotes ? (
            <TextField
              fullWidth
              multiline
              rows={4}
              value={notes}
              onChange={handleNotesChange}
              placeholder="메모를 입력하세요..."
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {notes || '메모가 없습니다.'}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 항목 추가/수정 다이얼로그 */}
      <ItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        item={editingItem}
        onSave={handleSaveItem}
        categories={editingType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES}
        type={editingType}
      />
    </Container>
  );
};

export default ExpenseManagement; 