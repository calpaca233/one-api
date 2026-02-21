import { useContext } from 'react';
import { UserContext } from '../../context/User';
import { API } from '../../helpers';

export const useUserRefresh = () => {
  const [, userDispatch] = useContext(UserContext);

  const refreshUserData = async () => {
    try {
      const res = await API.get('/api/user/self');
      const { success, message, data: serverData } = res.data;
      if (success) {
        // 更新用户状态为服务器返回的最新数据
        userDispatch({ type: 'login', payload: serverData });
        // 同时更新localStorage
        localStorage.setItem('user', JSON.stringify(serverData));
        return true;
      } else {
        console.warn('Failed to fetch latest user data:', message);
        return false;
      }
    } catch (error) {
      console.warn('Failed to fetch latest user data:', error);
      return false;
    }
  };

  return { refreshUserData };
};
