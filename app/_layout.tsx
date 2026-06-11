import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logoutUser } from '../services/authService';
import { CartProvider } from '../app/context/CartContext';

// ==========================================
// 1. COMPOSANT BOUTON DE MENU
// ==========================================
const CustomDrawerItem = ({ label, iconName, onPress, active }: any) => (
  <TouchableOpacity 
    onPress={onPress} 
    style={[styles.menuItem, active && styles.menuItemActive]}
  >
    <Feather name={iconName} size={20} color={active ? "#06b6d4" : "#A0A0A0"} />
    <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ==========================================
// 2. LE CONTENU DU MENU LATÉRAL (Le clone de Navbar.jsx)
// ==========================================
function CustomDrawerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  // Équivalent du "Safe User Retrieval" du web
  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error("Error parsing user data", e);
        await AsyncStorage.removeItem('user');
      }
    };
    checkUser();
  }, [pathname]); // Se met à jour à chaque changement de page

  // "Safe Name Logic" clonée
  const getSafeName = () => {
    const fallback = user?.user_metadata?.role === 'admin' ? 'Admin' : 'Client';
    if (!user || !user.user_metadata) return fallback;
    const nameData = user.user_metadata.full_name;
    if (typeof nameData === 'string' && nameData.trim() !== '') return nameData;
    if (typeof nameData === 'object' && nameData?.full_name) return nameData.full_name;
    return fallback;
  };

  const displayName = getSafeName();
  const displayInitial = user?.email ? user.email[0].toUpperCase() : 'U';
  const isAdmin = user?.user_metadata?.role === 'admin';

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1C2128' }}>
      <ScrollView style={styles.drawerContainer} contentContainerStyle={{ paddingTop: 20 }}>
        
        {/* === EN-TÊTE DU MENU (Logo) === */}
        <View style={styles.drawerHeader}>
          <View style={styles.logoBox}>
            <Feather name="shield" size={24} color="#06b6d4" />
          </View>
          <Text style={styles.brandTitle}>CYNA<Text style={styles.brandAccent}>DEFENSE</Text></Text>
        </View>

        {/* === ESPACE UTILISATEUR === */}
        <View style={styles.userSection}>
        {user ? (
            <TouchableOpacity 
              style={styles.userInfoBox}
              onPress={() => {
                // Redirige vers /admin si c'est un admin, sinon vers le dashboard client
                router.push(isAdmin ? '/admin' : '/dashboard');
              }}
              activeOpacity={0.7}
            >
               <View style={styles.userAvatar}>
                 <Text style={styles.avatarText}>{displayInitial}</Text>
                 <View style={styles.onlineDot} />
               </View>
               <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                  <Text style={styles.userRole}>{isAdmin ? 'Administrateur' : 'Espace Client'}</Text>
               </View>
               {/* Petit icône pour indiquer que c'est cliquable */}
               <Feather name="chevron-right" size={20} color="#06b6d4" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
              <Text style={styles.loginBtnText}>S'AUTHENTIFIER</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        {/* === NAVIGATION PRINCIPALE === */}
        <Text style={styles.sectionTitle}>GÉNÉRAL</Text>
        <CustomDrawerItem label="Accueil" iconName="home" active={pathname === '/'} onPress={() => router.push('/')} />
        <CustomDrawerItem label="Catalogue" iconName="grid" active={pathname === '/category'} onPress={() => router.push('/category')} />
        <CustomDrawerItem label="Mon Panier" iconName="shopping-cart" active={pathname === '/cart'} onPress={() => router.push('/cart')} />
        <CustomDrawerItem label="Recherche" iconName="search" active={pathname === '/search'} onPress={() => router.push('/search')} />

        <View style={styles.divider} />

        {/* === LIENS LÉGAUX (Comme sur le web) === */}
        <Text style={styles.sectionTitle}>INFORMATIONS</Text>
        <CustomDrawerItem label="Mentions Légales" iconName="shield" active={pathname === '/mentions'} onPress={() => {}} />
        <CustomDrawerItem label="Confidentialité" iconName="lock" active={pathname === '/privacy'} onPress={() => {}} />
        <CustomDrawerItem label="Contact" iconName="mail" active={pathname === '/contact'} onPress={() => {}} />

        {/* === DÉCONNEXION === */}
        {user && (
          <View style={styles.logoutContainer}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#FF3B3B" />
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ==========================================
// 3. LE CONFIGURATEUR GLOBAL (App Layout)
// ==========================================
export default function RootLayout() {
  return (
    <CartProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer 
          drawerContent={() => <CustomDrawerContent />}
          screenOptions={{
            // 1. Force le fond de la barre en sombre
            headerStyle: { 
              backgroundColor: '#0B0E14', 
              elevation: 0, // Enlève l'ombre sur Android
              shadowOpacity: 0, // Enlève l'ombre sur iOS
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.05)',
            },
            // 2. Met l'icône du menu Burger en blanc
            headerTintColor: '#ffffff', 
            // 3. Centre le titre/logo
            headerTitleAlign: 'center',
            // 4. Assure que le fond derrière les pages est bien sombre
            sceneContainerStyle: { backgroundColor: '#0B0E14' },
          }}
        >
          {/* Tes écrans */}
          <Drawer.Screen 
            name="index" 
            options={{ 
              drawerLabel: 'Accueil', // Nom dans le menu latéral
              headerTitle: () => ( // Logo CYNA dans la barre du haut
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2 }}>
                  CYNA<Text style={{ color: '#06b6d4' }}>DEFENSE</Text>
                </Text>
              )
            }} 
          />
          <Drawer.Screen name="login" options={{ headerShown: false }} /> 
          <Drawer.Screen name="cart" options={{ headerShown: false }} /> 
          <Drawer.Screen name="category" options={{ headerShown: false }} /> 
          <Drawer.Screen name="search" options={{ headerShown: false }} />
          <Drawer.Screen name="dashboard" options={{ headerShown: false }} /> 
        </Drawer>
      </GestureHandlerRootView>
    </CartProvider>
  );
}

// ==========================================
// STYLES 
// ==========================================
const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: '#1C2128' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20 },
  logoBox: { width: 40, height: 40, backgroundColor: 'rgba(6, 182, 212, 0.1)', borderWidth: 2, borderColor: '#06b6d4', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  brandTitle: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  brandAccent: { color: '#06b6d4' },
  
  userSection: { paddingHorizontal: 20, paddingBottom: 10 },
  userInfoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2D333B' },
  userAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(6, 182, 212, 0.1)', borderWidth: 1, borderColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#06b6d4', fontWeight: 'bold', fontSize: 18 },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, backgroundColor: '#00FF94', borderRadius: 5, borderWidth: 2, borderColor: '#0B0E14' },
  userName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  userRole: { color: '#06b6d4', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 2 },
  
  loginBtn: { backgroundColor: '#06b6d4', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  loginBtnText: { color: '#0B0E14', fontWeight: '900', fontSize: 12, letterSpacing: 1 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 15 },
  sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginLeft: 20, marginBottom: 10 },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, marginHorizontal: 10, borderRadius: 10, marginBottom: 4 },
  menuItemActive: { backgroundColor: 'rgba(6, 182, 212, 0.1)' },
  menuItemText: { color: '#A0A0A0', marginLeft: 15, fontSize: 14, fontWeight: '600' },
  menuItemTextActive: { color: '#06b6d4', fontWeight: 'bold' },

  logoutContainer: { padding: 20, marginTop: 20 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 59, 59, 0.1)', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255, 59, 59, 0.3)', justifyContent: 'center' },
  logoutText: { color: '#FF3B3B', marginLeft: 10, fontWeight: 'bold', fontSize: 14 },
});