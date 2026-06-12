import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, SafeAreaView, Modal
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';

export default function AdminOrdersScreen() {
  const router = useRouter();

  // --- ÉTATS ---
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });

  // Modal pour modifier le statut
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // --- CHARGEMENT ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.all([
        api.get('/orders').catch(() => ({ data: [] })),
        api.get('/auth/users').catch(() => ({ data: { users: [] } }))
      ]);
      
      setOrders(ordersRes.data || []);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.users || []));
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les commandes.");
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await api.patch(`/orders/${id}/status`, { status: newStatus });
      if (res.status === 200 || res.status === 201) {
        setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
        setSelectedOrder(null);
        Alert.alert("Succès", "Statut mis à jour.");
      }
    } catch (err) {
      Alert.alert("Erreur", "Mise à jour impossible.");
    }
  };

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // --- LOGIQUE FILTRE & TRI ---
  const getSortedOrders = () => {
    if (!Array.isArray(orders)) return [];
    
    let filterData = orders.filter(o => {
      const user = users.find(u => u.id === o.user_id);
      const rawName = user?.user_metadata?.full_name;
      const safeName = typeof rawName === 'object' ? rawName?.full_name : rawName;
      
      const searchString = `${o.id} ${o.user_id} ${user?.email || ''} ${safeName || ''} ${user?.user_metadata?.company || ''}`.toLowerCase();
      
      const matchesStatus = statusFilter === 'all' 
        || o.status === statusFilter 
        || (statusFilter === 'paid' && o.status === 'completed');
        
      const matchesSearch = searchString.includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
    
    return filterData.sort((a, b) => {
      let valA = sortConfig.key === 'total' ? parseFloat(a.total_amount || a.total || 0) : a[sortConfig.key];
      let valB = sortConfig.key === 'total' ? parseFloat(b.total_amount || b.total || 0) : b[sortConfig.key];

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // --- HELPERS UI ---
  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'completed':
      case 'paid': 
        return { text: 'Payé', color: '#00FF94', bg: 'rgba(0, 255, 148, 0.1)', icon: 'check-circle' };
      case 'pending': 
        return { text: 'En attente', color: '#F5A623', bg: 'rgba(245, 166, 35, 0.1)', icon: 'clock' };
      default: 
        return { text: 'Annulé', color: '#FF3B3B', bg: 'rgba(255, 59, 59, 0.1)', icon: 'x-circle' };
    }
  };

  const sortedOrders = getSortedOrders();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
          <Feather name="arrow-left" size={24} color="#A0A0A0" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Commandes</Text>
          <Text style={styles.headerSubtitle}>Total : {sortedOrders.length}</Text>
        </View>
      </View>

      {/* FILTRES FIXES EN HAUT */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#A0A0A0" style={{ marginLeft: 12 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder="ID, Email, Nom..."
            placeholderTextColor="#555"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <View style={styles.filterBtnsRow}>
          {['all', 'paid', 'pending', 'cancelled'].map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterPill, statusFilter === f && styles.filterPillActive]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[styles.filterPillText, statusFilter === f && styles.filterPillTextActive]}>
                {f === 'all' ? 'TOUTES' : f === 'paid' ? 'PAYÉES' : f === 'pending' ? 'EN ATTENTE' : 'ANNULÉES'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton de Tri Rapide */}
        <TouchableOpacity style={styles.sortBtn} onPress={() => handleSort('created_at')}>
          <Feather name="calendar" size={14} color="#A0A0A0" />
          <Text style={styles.sortBtnText}>
            Trier par date {sortConfig.key === 'created_at' && (sortConfig.direction === 'desc' ? '↓' : '↑')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTE DES COMMANDES (Cartes) */}
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
          </View>
        ) : sortedOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="shopping-cart" size={40} color="#2D333B" style={{marginBottom: 16}} />
            <Text style={styles.emptyText}>Aucune commande trouvée.</Text>
          </View>
        ) : (
          sortedOrders.map((order) => {
            const user = users.find(u => u.id === order.user_id);
            const rawName = user?.user_metadata?.full_name;
            const safeName = typeof rawName === 'object' ? rawName?.full_name : rawName;
            const userName = safeName || user?.user_metadata?.company || 'Client Inconnu';
            const userEmail = user?.email || String(order.user_id).substring(0, 12) + '...';
            
            const display = getStatusDisplay(order.status);
            const totalTTC = (Number(order.total_amount || order.total || 0) * 1.20).toFixed(2);

            return (
              <View key={order.id} style={styles.orderCard}>
                
                {/* Ligne 1: ID et Statut */}
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>#{String(order.id).substring(0, 8)}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: display.bg }]}>
                    <Feather name={display.icon as any} size={12} color={display.color} />
                    <Text style={[styles.statusText, { color: display.color }]}>{display.text}</Text>
                  </View>
                </View>

                {/* Ligne 2: Client */}
                <View style={styles.clientBox}>
                  <View style={styles.clientAvatar}>
                    <Feather name="user" size={16} color="#06b6d4" />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.clientName} numberOfLines={1}>{userName}</Text>
                    <Text style={styles.clientEmail} numberOfLines={1}>{userEmail}</Text>
                  </View>
                </View>

                {/* Ligne 3: Date, Prix et Action */}
                <View style={styles.orderFooter}>
                  <View>
                    <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString()}</Text>
                    <Text style={styles.orderTotal}>{totalTTC} € <Text style={styles.orderTTC}>TTC</Text></Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.btnEditStatus}
                    onPress={() => setSelectedOrder(order)}
                  >
                    <Feather name="edit-2" size={14} color="#0B0E14" />
                    <Text style={styles.btnEditStatusText}>Gérer</Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODAL: CHANGER LE STATUT */}
      <Modal visible={!!selectedOrder} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier la commande</Text>
              <TouchableOpacity onPress={() => setSelectedOrder(null)} style={{padding: 4}}>
                <Feather name="x" size={24} color="#A0A0A0" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>ID : #{selectedOrder?.id?.substring(0, 8)}</Text>

            <View style={styles.modalOptions}>
              <TouchableOpacity style={styles.modalBtnSuccess} onPress={() => handleStatusChange(selectedOrder.id, 'paid')}>
                <Feather name="check-circle" size={18} color="#00FF94" />
                <Text style={styles.modalBtnSuccessText}>Marquer comme PAYÉE</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modalBtnWarning} onPress={() => handleStatusChange(selectedOrder.id, 'pending')}>
                <Feather name="clock" size={18} color="#F5A623" />
                <Text style={styles.modalBtnWarningText}>Mettre EN ATTENTE</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.modalBtnDanger} onPress={() => handleStatusChange(selectedOrder.id, 'cancelled')}>
                <Feather name="x-circle" size={18} color="#FF3B3B" />
                <Text style={styles.modalBtnDangerText}>ANNULER la commande</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B' },
  btnBack: { padding: 8, marginRight: 12 },
  headerTitleBox: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'black', letterSpacing: 1 },
  headerSubtitle: { color: '#06b6d4', fontSize: 12, fontWeight: 'bold' },

  filtersContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B', backgroundColor: '#1C2128' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, color: '#fff', paddingHorizontal: 12, fontSize: 14 },
  
  filterBtnsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterPill: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 8 },
  filterPillActive: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: '#06b6d4' },
  filterPillText: { color: '#A0A0A0', fontSize: 9, fontWeight: 'bold' },
  filterPillTextActive: { color: '#06b6d4' },

  sortBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, paddingVertical: 4 },
  sortBtnText: { color: '#A0A0A0', fontSize: 12, fontWeight: 'bold' },

  listContent: { padding: 16, paddingBottom: 60 },
  centerContainer: { py: 40, alignItems: 'center' },
  emptyCard: { backgroundColor: '#1C2128', padding: 40, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2D333B' },
  emptyText: { color: '#A0A0A0', fontSize: 14 },

  orderCard: { backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 16, padding: 16, marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderId: { color: '#A0A0A0', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'black', textTransform: 'uppercase' },

  clientBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0B0E14', padding: 12, borderRadius: 12, marginBottom: 16 },
  clientAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(6, 182, 212, 0.1)', alignItems: 'center', justifyContent: 'center' },
  clientName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  clientEmail: { color: '#A0A0A0', fontSize: 12 },

  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  orderDate: { color: '#555', fontSize: 12, marginBottom: 2 },
  orderTotal: { color: '#06b6d4', fontSize: 18, fontWeight: 'black', fontFamily: 'monospace' },
  orderTTC: { fontSize: 10, color: '#A0A0A0', fontFamily: 'sans-serif' },

  btnEditStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#06b6d4', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnEditStatusText: { color: '#0B0E14', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 14, 20, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C2128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#2D333B' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'black' },
  modalSubtitle: { color: '#A0A0A0', fontSize: 12, fontFamily: 'monospace', marginBottom: 24 },
  
  modalOptions: { gap: 12 },
  modalBtnSuccess: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0, 255, 148, 0.1)', borderWidth: 1, borderColor: '#00FF94', paddingVertical: 16, borderRadius: 12 },
  modalBtnSuccessText: { color: '#00FF94', fontWeight: 'bold', fontSize: 14 },
  
  modalBtnWarning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(245, 166, 35, 0.1)', borderWidth: 1, borderColor: '#F5A623', paddingVertical: 16, borderRadius: 12 },
  modalBtnWarningText: { color: '#F5A623', fontWeight: 'bold', fontSize: 14 },
  
  modalBtnDanger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(255, 59, 59, 0.1)', borderWidth: 1, borderColor: '#FF3B3B', paddingVertical: 16, borderRadius: 12 },
  modalBtnDangerText: { color: '#FF3B3B', fontWeight: 'bold', fontSize: 14 },
});