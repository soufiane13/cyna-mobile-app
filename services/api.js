import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🚀 Détection automatique de l'environnement (Émulateur Android vs Web/iOS)
const BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'https://cyna-api-d6b4.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🛡️ Intercepteur : Ajoute automatiquement le badge de sécurité (Token) à chaque requête
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Erreur lors de la lecture du token :", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;