import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fonction pour se connecter
export const loginUser = async (email, password) => {
  try {
    // api.post utilise automatiquement la bonne URL de base (définie dans api.js)
    const response = await api.post('/auth/login', { email, password });
    
    // Axios place automatiquement la réponse JSON dans "data"
    const data = response.data;
    
    // On sauvegarde le token et l'utilisateur dans le coffre-fort mobile
    if (data.token) {
      // Note : On utilise 'userToken' pour matcher avec l'intercepteur de notre fichier api.js
      await AsyncStorage.setItem('userToken', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  } catch (error) {
    // Gestion des erreurs propre à Axios
    throw new Error(error.response?.data?.message || "Erreur de connexion");
  }
};

// Fonction pour s'inscrire
export const registerUser = async (email, password, fullName) => {
  try {
    const response = await api.post('/auth/register', { email, password, fullName });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Erreur d'inscription");
  }
};

// Fonction pour se déconnecter
export const logoutUser = async () => {
  try {
    // AsyncStorage est asynchrone, il faut utiliser await
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('user');
  } catch (error) {
    console.error("Erreur lors de la déconnexion :", error);
  }
};