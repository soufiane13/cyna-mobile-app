import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, SafeAreaView, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';

export default function AdminUsersScreen() {
  const router = useRouter();

  // --- ÉTATS ---
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Email Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '', isCollective: false });
  const [sendingEmail, setSendingEmail] = useState(false);

  // --- CHARGEMENT ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, ordersRes] = await Promise.all([
        api.get('/auth/users').catch(() => ({ data: [] })),
        api.get('/orders').catch(() => ({ data: [] }))
      ]);
      
      // Adaptation selon la structure retournée par ton backend NestJS (parfois englobé dans .users)
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || []));
      setOrders(ordersRes.data || []);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIQUE ABONNEMENTS ---
  const hasActiveSubscription = (userId: string) => {
    return orders.some(o => 
      o.user_id === userId && 
      (o.status === 'paid' || o.status === 'completed') && 
      (o.order_items?.length > 0)
    );
  };

  const getUserSubscriptions = (userId: string) => {
    const userOrders = orders.filter(o => o.user_id === userId && (o.status === 'paid' || o.status === 'completed'));
    const subs = userOrders.flatMap(o => (o.order_items || []).map((item:any) => item.products?.name || item.products?.nom));

    if (subs.length === 0) return <Text style={styles.noSubText}>Aucun abonnement actif</Text>;

    const uniqueSubs = [...new Set(subs)];
    return (
      <View style={styles.subsWrapper}>
        {uniqueSubs.map((sub, i) => (
          <View key={i} style={styles.subBadge}>
            <Text style={styles.subBadgeText} numberOfLines={1}>{String(sub)}</Text>
          </View>
        ))}
      </View>
    );
  };

  // --- LOGIQUE SUPPRESSION ---
  const triggerDelete = (user: any) => {
    Alert.alert(
      "Supprimer cet utilisateur ?",
      `Vous êtes sur le point de supprimer définitivement :\n${user.email}\n\nCette action est irréversible.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => executeDelete(user.id) }
      ]
    );
  };

  const executeDelete = async (userId: string) => {
    try {
      await api.delete(`/auth/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      Alert.alert("Succès", "L'utilisateur a été supprimé.");
    } catch (error: any) {
      Alert.alert("Erreur", error.response?.data?.message || "Erreur lors de la suppression.");
    }
  };

  // --- LOGIQUE EMAIL ---
  const openCollectiveEmail = () => {
    setEmailData({ to: users.map(u => u.email).join(', '), subject: '', message: '', isCollective: true });
    setIsEmailModalOpen(true);
  };

  const openPersonalEmail = (email: string) => {
    setEmailData({ to: email, subject: '', message: '', isCollective: false });
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await api.post('/messages/send-email', { 
        to: emailData.to, 
        subject: emailData.subject, 
        message: emailData.message 
      });
      Alert.alert("Succès", "Email(s) envoyé(s) avec succès !");
      setIsEmailModalOpen(false);
    } catch (e) {
      Alert.alert("Erreur", "Échec de l'envoi de l'email.");
    } finally {
      setSendingEmail(false);
    }
  };

  // --- FILTRES & KPIs ---
  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const currentMonth = new Date().getMonth();
  const newUsersThisMonth = users.filter(u => new Date(u.created_at).getMonth() === currentMonth).length;
  const activeSubsCount = orders.filter(o => o.status === 'paid' || o.status === 'completed').reduce((acc, o) => acc + (o.order_items?.length || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
            <Feather name="arrow-left" size={24} color="#A0A0A0" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Utilisateurs</Text>
            <Text style={styles.headerSubtitle}>Base clients</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.btnCollective} onPress={openCollectiveEmail}>
          <Feather name="mail" size={16} color="#0B0E14" />
          <Text style={styles.btnCollectiveText}>Message Collectif</Text>
        </TouchableOpacity>
      </View>

      {/* RECHERCHE FIXE EN HAUT */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#A0A0A0" style={{ marginLeft: 12 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Rechercher un email..."
            placeholderTextColor="#555"
            value={searchTerm}
            onChangeText={setSearchTerm}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        
        {/* KPIs HORIZONTAUX */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiScroll}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Inscrits</Text>
            <Text style={styles.kpiValue}>{users.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Abonnements</Text>
            <Text style={[styles.kpiValue, {color: '#06b6d4'}]}>{activeSubsCount}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Nouveaux (Mois)</Text>
            <Text style={[styles.kpiValue, {color: '#00FF94'}]}>+{newUsersThisMonth}</Text>
          </View>
        </ScrollView>

        <View style={styles.separator} />

        {/* LISTE DES UTILISATEURS */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="users" size={40} color="#2D333B" style={{marginBottom: 16}} />
            <Text style={styles.emptyText}>Aucun utilisateur trouvé.</Text>
          </View>
        ) : (
          filteredUsers.map((u) => {
            const isAdmin = u.role === 'admin' || u.user_metadata?.role === 'admin';
            const isActive = hasActiveSubscription(u.id);

            return (
              <View key={u.id} style={styles.userCard}>
                
                {/* Ligne 1: Avatar + Email + Badge Role */}
                <View style={styles.userHeader}>
                  <View style={styles.userInfoBox}>
                    <View style={styles.avatar}>
                      <Feather name="user" size={16} color="#06b6d4" />
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
                  </View>
                  {isAdmin ? (
                    <View style={styles.adminBadge}><Feather name="shield" size={10} color="#F5A623"/><Text style={styles.adminBadgeText}>Admin</Text></View>
                  ) : (
                    <View style={styles.clientBadge}><Text style={styles.clientBadgeText}>Client</Text></View>
                  )}
                </View>

                {/* Ligne 2: Abonnements */}
                <View style={styles.subsSection}>
                  <Text style={styles.sectionLabel}>SERVICES ACTIFS</Text>
                  {getUserSubscriptions(u.id)}
                </View>

                {/* Ligne 3: Date & Actions */}
                <View style={styles.userFooter}>
                  <Text style={styles.dateText}>Inscrit le {new Date(u.created_at).toLocaleDateString('fr-FR')}</Text>
                  
                  <View style={styles.actionsRow}>
                    <TouchableOpacity onPress={() => openPersonalEmail(u.email)} style={styles.actionBtnEmail}>
                      <Feather name="mail" size={16} color="#A0A0A0" />
                    </TouchableOpacity>
                    
                    {isAdmin ? (
                      <View style={[styles.actionBtnDelete, {opacity: 0.3}]}><Feather name="shield" size={16} color="#A0A0A0" /></View>
                    ) : isActive ? (
                      <TouchableOpacity style={[styles.actionBtnDelete, {opacity: 0.3}]} onPress={() => Alert.alert("Impossible", "Cet utilisateur a des abonnements actifs. Résiliez-les d'abord.")}>
                        <Feather name="trash-2" size={16} color="#FF3B3B" />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => triggerDelete(u)} style={styles.actionBtnDeleteActive}>
                        <Feather name="trash-2" size={16} color="#FF3B3B" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODALE D'ENVOI D'EMAIL */}
      <Modal visible={isEmailModalOpen} transparent={true} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Feather name="mail" size={20} color="#06b6d4" />
                <Text style={styles.modalTitle}>{emailData.isCollective ? "Message Collectif" : "Message Personnel"}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEmailModalOpen(false)} style={{padding: 4}}>
                <Feather name="x" size={24} color="#A0A0A0" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>DESTINATAIRE(S)</Text>
                <View style={styles.fakeInput}>
                  <Text style={styles.fakeInputText} numberOfLines={1}>
                    {emailData.isCollective ? `Tous les utilisateurs (${users.length} contacts)` : emailData.to}
                  </Text>
                </View>
              </View>
              
              <View>
                <Text style={styles.label}>SUJET</Text>
                <TextInput 
                  style={styles.input} 
                  value={emailData.subject} 
                  onChangeText={t => setEmailData({...emailData, subject: t})} 
                  placeholder="Objet de l'email..."
                  placeholderTextColor="#555"
                />
              </View>

              <View>
                <Text style={styles.label}>MESSAGE</Text>
                <TextInput 
                  style={[styles.input, {height: 120, textAlignVertical: 'top'}]} 
                  multiline 
                  value={emailData.message} 
                  onChangeText={t => setEmailData({...emailData, message: t})} 
                  placeholder="Votre message..."
                  placeholderTextColor="#555"
                />
              </View>

              <TouchableOpacity 
                style={[styles.modalApplyBtn, (!emailData.subject || !emailData.message) && {opacity: 0.5}]} 
                onPress={handleSendEmail} 
                disabled={sendingEmail || !emailData.subject || !emailData.message}
              >
                {sendingEmail ? <ActivityIndicator color="#0B0E14" /> : <Text style={styles.modalApplyBtnText}>ENVOYER LE MESSAGE</Text>}
              </TouchableOpacity>
            </ScrollView>

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#2D333B', backgroundColor: '#1C2128' },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  btnBack: { padding: 8, marginRight: 12 },
  headerTitleBox: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'black', letterSpacing: 1 },
  headerSubtitle: { color: '#A0A0A0', fontSize: 12 },
  
  btnCollective: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#06b6d4', paddingVertical: 12, borderRadius: 10 },
  btnCollectiveText: { color: '#0B0E14', fontWeight: 'black', fontSize: 14 },

  searchContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B', backgroundColor: '#1C2128' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, height: 44 },
  searchInput: { flex: 1, color: '#fff', paddingHorizontal: 12, fontSize: 14 },

  listContent: { paddingBottom: 60 },
  
  kpiScroll: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  kpiCard: { backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, padding: 16, width: 140 },
  kpiLabel: { color: '#A0A0A0', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  kpiValue: { color: '#fff', fontSize: 24, fontWeight: 'black' },

  separator: { height: 1, backgroundColor: '#2D333B', marginVertical: 16, marginHorizontal: 16 },

  centerContainer: { py: 40, alignItems: 'center' },
  emptyCard: { backgroundColor: '#1C2128', padding: 40, borderRadius: 16, marginHorizontal: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2D333B' },
  emptyText: { color: '#A0A0A0', fontSize: 14 },

  userCard: { backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12 },
  
  userHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  userInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(6, 182, 212, 0.1)', alignItems: 'center', justifyContent: 'center' },
  userEmail: { color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1 },
  
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245, 166, 35, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  adminBadgeText: { color: '#F5A623', fontSize: 9, fontWeight: 'black', textTransform: 'uppercase' },
  clientBadge: { backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  clientBadgeText: { color: '#A0A0A0', fontSize: 9, fontWeight: 'black', textTransform: 'uppercase' },

  subsSection: { backgroundColor: '#0B0E14', padding: 12, borderRadius: 10, marginBottom: 12 },
  sectionLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', marginBottom: 8 },
  noSubText: { color: '#555', fontSize: 11, fontStyle: 'italic' },
  subsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subBadge: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.3)', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  subBadgeText: { color: '#06b6d4', fontSize: 10, fontWeight: 'bold' },

  userFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  dateText: { color: '#555', fontSize: 11 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtnEmail: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8 },
  actionBtnDelete: { padding: 8, backgroundColor: 'rgba(255, 59, 59, 0.05)', borderRadius: 8 },
  actionBtnDeleteActive: { padding: 8, backgroundColor: 'rgba(255, 59, 59, 0.1)', borderRadius: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 14, 20, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C2128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#2D333B', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'black' },
  
  label: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, height: 48, paddingHorizontal: 16, color: '#fff', fontSize: 14 },
  fakeInput: { backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  fakeInputText: { color: '#A0A0A0', fontSize: 14 },

  modalApplyBtn: { backgroundColor: '#06b6d4', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  modalApplyBtnText: { color: '#0B0E14', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});