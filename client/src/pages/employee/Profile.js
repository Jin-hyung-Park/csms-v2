import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, getCurrentUser } from '../../store/slices/authSlice';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Avatar,
  IconButton,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Save,
  Cancel,
  PhotoCamera,
  Person,
  Email,
  Phone,
  LocationOn,
  Event,
} from '@mui/icons-material';
import { useIsMobile } from '../../hooks/useMediaQuery';

const validationSchema = Yup.object({
  username: Yup.string()
    .required('이름을 입력해주세요')
    .min(2, '이름은 2자 이상이어야 합니다')
    .max(20, '이름은 20자를 초과할 수 없습니다'),
  phoneNumber: Yup.string()
    .matches(/^[0-9-]+$/, '올바른 전화번호 형식을 입력해주세요')
    .required('전화번호를 입력해주세요'),
  address: Yup.string()
    .required('주소를 입력해주세요')
    .max(200, '주소는 200자를 초과할 수 없습니다'),
  currentPassword: Yup.string()
    .min(6, '비밀번호는 6자 이상이어야 합니다'),
  newPassword: Yup.string()
    .min(6, '새 비밀번호는 6자 이상이어야 합니다'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], '비밀번호가 일치하지 않습니다'),
});

const Profile = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const { user, loading, error } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  // 디버깅을 위한 콘솔 로그
  useEffect(() => {
    console.log('Profile 컴포넌트 - 사용자 정보:', user);
    console.log('Profile 컴포넌트 - 입사일 정보:', user?.hireDate);
  }, [user]);

  // 사용자 정보가 없으면 다시 로드
  useEffect(() => {
    if (!user && !loading) {
      dispatch(getCurrentUser());
    }
  }, [user, loading, dispatch]);

  const formik = useFormik({
    initialValues: {
      username: user?.username || '',
      phoneNumber: user?.phoneNumber || '',
      address: user?.address || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values) => {
      try {
        const updateData = {
          username: values.username,
          phoneNumber: values.phoneNumber,
          address: values.address,
        };

        // 비밀번호 변경이 요청된 경우에만 추가
        if (values.currentPassword && values.newPassword) {
          updateData.currentPassword = values.currentPassword;
          updateData.newPassword = values.newPassword;
        }

        await dispatch(updateProfile(updateData)).unwrap();
        setIsEditing(false);
        formik.setFieldValue('currentPassword', '');
        formik.setFieldValue('newPassword', '');
        formik.setFieldValue('confirmPassword', '');
        alert('프로필이 성공적으로 업데이트되었습니다.');
      } catch (error) {
        console.error('프로필 업데이트 실패:', error);
        const errorMessage = error.message || '프로필 업데이트에 실패했습니다';
        alert(errorMessage);
      }
    },
  });

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    formik.resetForm();
    setProfileImage(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        프로필 수정
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 프로필 이미지 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box position="relative" display="inline-block">
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    mx: 'auto',
                    mb: 2,
                  }}
                  src={profileImage || user?.profileImage}
                >
                  <Person sx={{ fontSize: 60 }} />
                </Avatar>
                {isEditing && (
                  <IconButton
                    component="label"
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                    }}
                  >
                    <PhotoCamera />
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </IconButton>
                )}
              </Box>
              <Typography variant="h6" gutterBottom>
                {user?.username}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.role === 'owner' ? '점주' : '근로자'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 프로필 정보 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                기본 정보
              </Typography>
              {!isEditing ? (
                <Button
                  variant="contained"
                  startIcon={<Person />}
                  onClick={() => setIsEditing(true)}
                >
                  수정
                </Button>
              ) : (
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<Cancel />}
                    onClick={handleCancel}
                    sx={{ mr: 1 }}
                  >
                    취소
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={formik.handleSubmit}
                  >
                    저장
                  </Button>
                </Box>
              )}
            </Box>

            <form onSubmit={formik.handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="이름"
                    name="username"
                    value={formik.values.username}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.username && Boolean(formik.errors.username)}
                    helperText={formik.touched.username && formik.errors.username}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="이메일"
                    name="email"
                    value={user?.email || ''}
                    disabled={true}
                    InputProps={{
                      startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    helperText="이메일 주소는 수정할 수 없습니다"
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="전화번호"
                    name="phoneNumber"
                    value={formik.values.phoneNumber}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.phoneNumber && Boolean(formik.errors.phoneNumber)}
                    helperText={formik.touched.phoneNumber && formik.errors.phoneNumber}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="입사일"
                    name="hireDate"
                    value={user?.hireDate ? new Date(user.hireDate).toLocaleDateString('ko-KR') : '입사일 정보 없음'}
                    disabled={true}
                    InputProps={{
                      startAdornment: <Event sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    helperText="입사일은 수정할 수 없습니다"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="주소"
                    name="address"
                    value={formik.values.address}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    error={formik.touched.address && Boolean(formik.errors.address)}
                    helperText={formik.touched.address && formik.errors.address}
                    disabled={!isEditing}
                    InputProps={{
                      startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>

                {isEditing && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          비밀번호 변경 (선택사항)
                        </Typography>
                      </Divider>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="현재 비밀번호"
                        name="currentPassword"
                        value={formik.values.currentPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.currentPassword && Boolean(formik.errors.currentPassword)}
                        helperText={formik.touched.currentPassword && formik.errors.currentPassword}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="새 비밀번호"
                        name="newPassword"
                        value={formik.values.newPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
                        helperText={formik.touched.newPassword && formik.errors.newPassword}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="새 비밀번호 확인"
                        name="confirmPassword"
                        value={formik.values.confirmPassword}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                        helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </form>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Profile; 