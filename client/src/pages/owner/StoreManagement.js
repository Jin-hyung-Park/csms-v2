import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useMeta } from '../../hooks/useMeta';

const StoreManagement = () => {
  const { 
    stores, 
    loading, 
    error, 
    fetchStores, 
    createStore, 
    updateStore, 
    deleteStore,
    selectedStoreId,
    currentStore,
    setSelectedStoreId
  } = useMeta();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    ownerName: '',
    businessNumber: '',
    description: ''
  });

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // 수동으로 점포 데이터 다시 로드
  const handleRetry = () => {
    fetchStores();
  };

  // 점포 선택 처리
  const handleStoreSelect = (storeId) => {
    setSelectedStoreId(storeId);
    // 점포 선택 시 즉시 반영
    console.log('점포 선택됨:', storeId);
  };

  const handleOpenDialog = (store = null) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        address: store.address,
        ownerName: store.ownerName || '',
        businessNumber: store.businessNumber || '',
        description: store.description || ''
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: '',
        address: '',
        ownerName: '',
        businessNumber: '',
        description: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStore(null);
    setFormData({
      name: '',
      address: '',
      ownerName: '',
      businessNumber: '',
      description: ''
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingStore) {
        await updateStore(editingStore._id, formData);
      } else {
        await createStore(formData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('점포 저장 오류:', error);
    }
  };

  const handleDelete = async (storeId) => {
    if (window.confirm('이 점포를 삭제하시겠습니까?')) {
      try {
        await deleteStore(storeId);
      } catch (error) {
        console.error('점포 삭제 오류:', error);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          점포 관리
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            disabled={Boolean(loading?.stores)}
          >
            새로고침
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            + 점포 추가
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={handleRetry}>
            재시도
          </Button>
        }>
          {error}
        </Alert>
      )}

      {loading?.stores && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {!loading?.stores && stores.length === 0 && !error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          점포관리에서 등록된 점포가 없습니다. 점포를 추가해보세요.
        </Alert>
      )}

      {!loading?.stores && stores.length > 0 && (
        <>
          {/* 현재 선택된 점포 정보 */}
          {currentStore && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  현재 선택된 점포
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <StoreIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {currentStore.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {currentStore.address}
                    </Typography>
                    {currentStore.ownerName && (
                      <Typography variant="body2" color="text.secondary">
                        성명: {currentStore.ownerName}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                                          <TableCell>선택</TableCell>
                    <TableCell>점포명</TableCell>
                    <TableCell>주소</TableCell>
                    <TableCell>성명</TableCell>
                    <TableCell>사업자번호</TableCell>
                    <TableCell>설명</TableCell>
                    <TableCell>등록일</TableCell>
                    <TableCell>작업</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store._id}>
                        <TableCell>
                          <Chip
                            label={selectedStoreId === store._id ? "선택됨" : "선택"}
                            color={selectedStoreId === store._id ? "primary" : "default"}
                            size="small"
                            onClick={() => handleStoreSelect(store._id)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <StoreIcon color="primary" />
                            <Typography variant="body1" fontWeight="medium">
                              {store.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{store.address}</TableCell>
                        <TableCell>{store.ownerName || '-'}</TableCell>
                        <TableCell>{store.businessNumber || '-'}</TableCell>
                        <TableCell>
                          {store.description ? (
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {store.description}
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(store.createdAt).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog(store)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(store._id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* 점포 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingStore ? '점포 수정' : '점포 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="점포명"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="주소"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="성명"
                value={formData.ownerName}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="사업자번호"
                value={formData.businessNumber}
                onChange={(e) => handleInputChange('businessNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="설명"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={Boolean(!formData.name || !formData.address)}
          >
            {editingStore ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StoreManagement; 