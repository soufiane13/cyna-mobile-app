import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Switch, Alert, ActivityIndicator, Linking, SafeAreaView 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { logoutUser } from '../services/authService';

export default function DashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- INITIALISATION ---
  useEffect(() => {
    const loadUserAndData = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        if (!userData) {
          router.replace('/login');
          return;
        }
        
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Récupération des commandes depuis NestJS
        const res = await api.get(`/orders/${parsedUser.id}`);
        setOrders(res.data || []);
      } catch (error) {
        console.error("Erreur chargement dashboard :", error);
      } finally {
        setLoading(false);
      }
    };
    loadUserAndData();
  }, []);

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  // --- HELPERS ---
  const getSafeName = () => {
    const nameData = user?.user_metadata?.full_name;
    if (typeof nameData === 'string') return nameData;
    if (typeof nameData === 'object' && nameData?.full_name) return nameData.full_name;
    return 'Utilisateur';
  };

  const displayName = getSafeName();
  const isAdmin = user?.user_metadata?.role === 'admin';

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/login');
  };

  // --- RENDERERS ---
  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <ProfileView user={user} safeName={displayName} />;
      case 'subs': return <SubscriptionsView orders={orders} />;
      case 'billing': return <BillingView />;
      case 'history': return <HistoryView orders={orders} />;
      default: return <ProfileView user={user} safeName={displayName} />;
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profil', icon: 'user' },
    { id: 'subs', label: 'Abonnements', icon: 'shield' },
    { id: 'billing', label: 'Facturation', icon: 'credit-card' },
    { id: 'history', label: 'Historique', icon: 'clock' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER UTILISATEUR */}
      <View style={styles.header}>
        {/* NOUVEAU : Bouton retour */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Feather name="arrow-left" size={24} color="#A0A0A0" />
        </TouchableOpacity>

        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>{user.email ? user.email[0].toUpperCase() : 'U'}</Text>
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{displayName}</Text>
          <Text style={styles.headerEmail}>{user.email}</Text>
        </View>
        
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={20} color="#FF3B3B" />
        </TouchableOpacity>
      </View>

      {/* TABS DE NAVIGATION (Scrollable horizontalement) */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          {tabs.map(tab => (
            <TouchableOpacity 
              key={tab.id} 
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Feather name={tab.icon as any} size={16} color={activeTab === tab.id ? "#06b6d4" : "#A0A0A0"} />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* CONTENU PRINCIPAL */}
      <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
        {renderContent()}
      </ScrollView>

    </SafeAreaView>
  );
}

// ==========================================
// SOUS-VUES DU DASHBOARD
// ==========================================

// 1. PROFIL & SÉCURITÉ
const ProfileView = ({ user, safeName }: { user: any, safeName: string }) => {
  const [formData, setFormData] = useState({
    fullName: safeName || '',
    phone: user?.user_metadata?.phone || '',
    company: user?.user_metadata?.company || '',
    address: user?.user_metadata?.address || '',
    password: '',
    confirmPassword: ''
  });
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (isChangingPwd && formData.password) {
      if (formData.password !== formData.confirmPassword) {
        return Alert.alert('Erreur', 'Les deux mots de passe ne correspondent pas.');
      }
      if (formData.password.length < 8) {
        return Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères.');
      }
    }

    setSaving(true);
    try {
      const res = await api.put(`/auth/profile/${user.id}`, formData);
      
      // Mise à jour du cache local
      const updatedUser = { ...user, user_metadata: res.data.user_metadata };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      Alert.alert('Succès', 'Vos informations ont été sauvegardées.');
      
      if (isChangingPwd) {
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
        setIsChangingPwd(false);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.response?.data?.message || 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Informations Personnelles</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>NOM COMPLET</Text>
        <TextInput style={styles.input} value={formData.fullName} onChangeText={(t) => setFormData({...formData, fullName: t})} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>EMAIL (Non modifiable)</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} value={user.email} editable={false} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TÉLÉPHONE</Text>
        <TextInput style={styles.input} placeholder="+33 6 00 00 00 00" placeholderTextColor="#555" value={formData.phone} onChangeText={(t) => setFormData({...formData, phone: t})} keyboardType="phone-pad" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>ENTREPRISE</Text>
        <TextInput style={styles.input} placeholder="Nom de l'entreprise" placeholderTextColor="#555" value={formData.company} onChangeText={(t) => setFormData({...formData, company: t})} />
      </View>

      {/* ZONE MOT DE PASSE */}
      {isChangingPwd && (
        <View style={styles.passwordSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NOUVEAU MOT DE PASSE</Text>
            <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#555" value={formData.password} onChangeText={(t) => setFormData({...formData, password: t})} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRMER LE MOT DE PASSE</Text>
            <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#555" value={formData.confirmPassword} onChangeText={(t) => setFormData({...formData, confirmPassword: t})} />
          </View>
        </View>
      )}

      {/* BOUTONS D'ACTION */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.btnPwd} onPress={() => setIsChangingPwd(!isChangingPwd)}>
          <Text style={styles.btnPwdText}>{isChangingPwd ? "Annuler" : "Modifier mot de passe"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSave} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#0B0E14" size="small" /> : <Text style={styles.btnSaveText}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 2. ABONNEMENTS ACTIFS
const SubscriptionsView = ({ orders }: { orders: any[] }) => {
  const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'completed');
  const activeSubs = paidOrders.flatMap(order =>
    (order.order_items || []).map((item: any) => ({
      ...item,
      order_date: order.created_at || order.date_commande
    }))
  );

  if (activeSubs.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Feather name="shield" size={40} color="#64748b" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>Aucun abonnement actif</Text>
        <Text style={styles.emptyDesc}>Les services apparaîtront ici une fois votre paiement validé.</Text>
      </View>
    );
  }

  return (
    <View style={styles.spaceY}>
      <Text style={styles.sectionTitle}>Mes Services Cyber</Text>
      {activeSubs.map((sub, idx) => (
        <View key={idx} style={styles.subCard}>
          <View style={styles.subHeader}>
            <Text style={styles.subTitle}>{sub.products?.name || sub.products?.nom || "Service SaaS"}</Text>
            <View style={styles.statusBadgeGreen}>
              <View style={styles.dotGreen} />
              <Text style={styles.statusTextGreen}>ACTIF</Text>
            </View>
          </View>
          
          <View style={styles.subInfoRow}>
            <Text style={styles.subInfoLabel}>Cycle :</Text>
            <Text style={styles.subInfoValue}>{sub.selected_plan === 'yearly' ? 'Annuel' : 'Mensuel'}</Text>
          </View>
          <View style={styles.subInfoRow}>
            <Text style={styles.subInfoLabel}>Licences :</Text>
            <Text style={styles.subInfoValue}>{sub.quantity} poste(s)</Text>
          </View>

          <View style={styles.subFooter}>
            <Text style={styles.subAutoRenewText}>Renouvellement auto.</Text>
            <Switch 
              value={true} 
              onValueChange={() => Alert.alert("Gestion", "Contactez le support pour résilier.")} 
              trackColor={{ false: "#2D333B", true: "#06b6d4" }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

// 3. FACTURATION (Cartes bancaires - Mock)
const BillingView = () => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Méthodes de paiement</Text>
      
      <View style={styles.creditCard}>
        <View style={styles.ccHeader}>
          <Text style={styles.ccBrand}>VISA</Text>
          <Feather name="trash-2" size={18} color="#FF3B3B" />
        </View>
        <Text style={styles.ccNumber}>**** **** **** 4242</Text>
        <Text style={styles.ccExp}>Expire 12/28</Text>
      </View>

      <TouchableOpacity style={styles.btnAddCard} onPress={() => Alert.alert("Sécurité", "Redirection vers Stripe pour l'ajout de carte.")}>
        <Feather name="plus" size={20} color="#A0A0A0" />
        <Text style={styles.btnAddCardText}>Ajouter une carte</Text>
      </TouchableOpacity>
    </View>
  );
};

// 4. HISTORIQUE DES COMMANDES
const HistoryView = ({ orders }: { orders: any[] }) => {
  if (orders.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Feather name="clock" size={40} color="#64748b" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>Aucune commande</Text>
        <Text style={styles.emptyDesc}>Votre historique de facturation est vide.</Text>
      </View>
    );
  }

  const handleDownload = (orderId: string | number) => {
    // Utilisation de Linking pour ouvrir le PDF généré par le backend dans le navigateur natif
    const url = `${api.defaults.baseURL}/orders/${orderId}/invoice`;
    Linking.openURL(url).catch(() => Alert.alert("Erreur", "Impossible de télécharger la facture."));
  };

  return (
    <View style={styles.spaceY}>
      <Text style={styles.sectionTitle}>Historique & Factures</Text>
      {orders.map((order) => {
        const isPaid = order.status === 'completed' || order.status === 'paid';
        const date = new Date(order.created_at || order.date_commande).toLocaleDateString();
        const total = (Number(order.total_amount || order.total) * 1.20).toFixed(2);

        return (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <View>
                <Text style={styles.orderId}>Commande #{order.id}</Text>
                <Text style={styles.orderDate}>{date}</Text>
              </View>
              <View style={isPaid ? styles.statusBadgeGreen : styles.statusBadgeGray}>
                <Text style={isPaid ? styles.statusTextGreen : styles.statusTextGray}>
                  {isPaid ? 'PAYÉ' : 'EN ATTENTE'}
                </Text>
              </View>
            </View>
            
            <View style={styles.orderBottom}>
              <Text style={styles.orderTotal}>{total} € <Text style={{fontSize: 12, color: '#A0A0A0'}}>TTC</Text></Text>
              
              {isPaid && (
                <TouchableOpacity style={styles.btnPdf} onPress={() => handleDownload(order.id)}>
                  <Feather name="download" size={16} color="#0B0E14" />
                  <Text style={styles.btnPdfText}>Facture</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  loadingContainer: { flex: 1, backgroundColor: '#0B0E14', justifyContent: 'center', alignItems: 'center' },
  spaceY: { gap: 16 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#2D333B' },
  avatarBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(6, 182, 212, 0.1)', borderWidth: 2, borderColor: '#06b6d4', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#06b6d4', fontSize: 20, fontWeight: 'black' },
  headerInfo: { flex: 1 },
  headerName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerEmail: { color: '#A0A0A0', fontSize: 12 },
  logoutBtn: { padding: 10, backgroundColor: 'rgba(255, 59, 59, 0.1)', borderRadius: 12 },

  // Tabs
  tabsContainer: { borderBottomWidth: 1, borderBottomColor: '#2D333B', paddingVertical: 12 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1C2128', marginRight: 10, borderWidth: 1, borderColor: '#2D333B' },
  tabBtnActive: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: '#06b6d4' },
  tabText: { color: '#A0A0A0', fontSize: 13, fontWeight: 'bold' },
  tabTextActive: { color: '#06b6d4' },

  // Content
  mainContent: { padding: 20, paddingBottom: 60 },
  card: { backgroundColor: '#1C2128', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#2D333B' },
  cardTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8 },

  // Form
  inputGroup: { marginBottom: 16 },
  label: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, height: 50, paddingHorizontal: 16, color: '#fff', fontSize: 14 },
  inputDisabled: { opacity: 0.5, backgroundColor: '#1C2128' },
  passwordSection: { borderTopWidth: 1, borderTopColor: '#2D333B', paddingTop: 16, marginTop: 8 },
  
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  btnPwd: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2D333B', alignItems: 'center' },
  btnPwdText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  btnSave: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#06b6d4', alignItems: 'center' },
  btnSaveText: { color: '#0B0E14', fontSize: 12, fontWeight: 'black' },

  // Subs & Orders
  emptyCard: { backgroundColor: '#1C2128', borderRadius: 20, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: '#2D333B' },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyDesc: { color: '#A0A0A0', fontSize: 12, textAlign: 'center' },

  subCard: { backgroundColor: '#1C2128', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2D333B' },
  subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  subTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  subInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  subInfoLabel: { color: '#A0A0A0', fontSize: 13 },
  subInfoValue: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  subFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2D333B' },
  subAutoRenewText: { color: '#A0A0A0', fontSize: 12, fontWeight: 'bold' },

  orderCard: { backgroundColor: '#1C2128', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2D333B' },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B', paddingBottom: 16 },
  orderId: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  orderDate: { color: '#A0A0A0', fontSize: 12 },
  orderBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { color: '#06b6d4', fontSize: 18, fontWeight: 'black', fontFamily: 'monospace' },
  btnPdf: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#06b6d4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnPdfText: { color: '#0B0E14', fontSize: 12, fontWeight: 'bold' },

  // Badges
  statusBadgeGreen: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 255, 148, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0, 255, 148, 0.3)' },
  statusBadgeGray: { backgroundColor: 'rgba(160, 160, 160, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(160, 160, 160, 0.3)' },
  dotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF94', marginRight: 6 },
  statusTextGreen: { color: '#00FF94', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statusTextGray: { color: '#A0A0A0', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  // Billing
  creditCard: { backgroundColor: '#0B0E14', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#2D333B', marginBottom: 16 },
  ccHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  ccBrand: { color: '#fff', fontSize: 16, fontWeight: 'black', fontStyle: 'italic' },
  ccNumber: { color: '#fff', fontSize: 18, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 },
  ccExp: { color: '#A0A0A0', fontSize: 12 },
  btnAddCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: '#2D333B' },
  btnAddCardText: { color: '#A0A0A0', fontSize: 14, fontWeight: 'bold' },
});