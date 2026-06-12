import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, SafeAreaView, Dimensions 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function AdminDashboardScreen() {
  const router = useRouter();

  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [alertText, setAlertText] = useState('');
  const [heroBg, setHeroBg] = useState('');
  const [carouselItems, setCarouselItems] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [outOfStock, setOutOfStock] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topSelling, setTopSelling] = useState<any[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [chartMode, setChartMode] = useState<'orders' | 'revenue'>('orders');

  const [stats, setStats] = useState({
    users: 0, usersThisMonth: 0, usersLastMonth: 0,
    orders: 0, ordersThisMonth: 0, ordersLastMonth: 0,
    revenue: 0, lastMonthRevenue: 0, annualRevenue: 0,
    activeProducts: 0, totalProducts: 0
  });

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const isCurrentMonth = (date: string) => {
          const d = new Date(date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };
        const isLastMonth = (date: string) => {
          const d = new Date(date);
          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        };

        // Requêtes parallèles pour plus de rapidité
        const [resCarousel, resHero, resTop, resUsers, resProducts, resOrders] = await Promise.all([
          api.get('/carousel').catch(() => ({ data: [] })),
          api.get('/hero-bg').catch(() => ({ data: null })),
          api.get('/top-products').catch(() => ({ data: [] })),
          api.get('/auth/users').catch(() => ({ data: [] })),
          api.get('/products').catch(() => ({ data: [] })),
          api.get('/orders').catch(() => ({ data: [] }))
        ]);

        // Carousel & Hero
        if (resCarousel.data?.length > 0) setCarouselItems(resCarousel.data);
        if (resHero.data?.image_url) setHeroBg(resHero.data.image_url);
        setTopProducts(resTop.data);

        // Utilisateurs
        const users = Array.isArray(resUsers.data) ? resUsers.data : (resUsers.data.users || []);
        const usersThisMonth = users.filter((u:any) => u.created_at && isCurrentMonth(u.created_at)).length;
        const usersLastMonth = users.filter((u:any) => u.created_at && isLastMonth(u.created_at)).length;

        // Produits (Ruptures)
        const productsData = resProducts.data;
        const outOfStockList = productsData.filter((p:any) => p.stock_virtuel <= 0);
        const activeCount = productsData.filter((p:any) => p.stock_virtuel > 0).length;
        setOutOfStock(outOfStockList);

        // Commandes & Revenus
        const ordersData = resOrders.data;
        const validOrders = ordersData.filter((o:any) => o.status === 'paid' || o.status === 'completed');
        
        const ordersThisMonth = validOrders.filter((o:any) => o.created_at && isCurrentMonth(o.created_at)).length;
        const ordersLastMonth = validOrders.filter((o:any) => o.created_at && isLastMonth(o.created_at)).length;

        const monthlyRev = validOrders.filter((o:any) => o.created_at && isCurrentMonth(o.created_at)).reduce((sum:number, o:any) => sum + Number(o.total_amount || o.total || 0), 0);
        const lastMonthRev = validOrders.filter((o:any) => o.created_at && isLastMonth(o.created_at)).reduce((sum:number, o:any) => sum + Number(o.total_amount || o.total || 0), 0);
        const annualRev = validOrders.filter((o:any) => o.created_at && new Date(o.created_at).getFullYear() === currentYear).reduce((sum:number, o:any) => sum + Number(o.total_amount || o.total || 0), 0);

        setStats({
          users: users.length, usersThisMonth, usersLastMonth,
          orders: ordersData.length, ordersThisMonth, ordersLastMonth,
          revenue: monthlyRev, lastMonthRevenue: lastMonthRev, annualRevenue: annualRev,
          activeProducts: activeCount, totalProducts: productsData.length
        });

        setRecentActivity(ordersData.slice(0, 5));

        // Graphique 12 mois
        const chartMonths = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setDate(1);
          d.setMonth(d.getMonth() - i);
          const m = d.getMonth();
          const y = d.getFullYear();
          const monthOrders = validOrders.filter((o:any) => {
            if (!o.created_at) return false;
            const od = new Date(o.created_at);
            return od.getMonth() === m && od.getFullYear() === y;
          });
          chartMonths.push({
            label: d.toLocaleDateString('fr-FR', { month: 'short' }),
            orders: monthOrders.length,
            revenue: monthOrders.reduce((s:number, o:any) => s + Number(o.total_amount || o.total || 0), 0),
            isCurrent: i === 0,
          });
        }
        setMonthlyChartData(chartMonths);

        // Top Ventes
        const productSales: any = {};
        validOrders.forEach((order:any) => {
          (order.order_items || []).forEach((item:any) => {
            const pName = item.products?.name || item.products?.nom || 'Service Inconnu';
            if (!productSales[pName]) productSales[pName] = { count: 0, revenue: 0 };
            productSales[pName].count += item.quantity;
            productSales[pName].revenue += (item.quantity * Number(item.price_at_purchase || 0));
          });
        });
        const sortedTop = Object.entries(productSales).map(([name, s]:any) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        setTopSelling(sortedTop);

      } catch (err) {
        Alert.alert("Erreur", "Impossible de charger les données du dashboard.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // --- SAUVEGARDES ---
  const updateAlert = async () => {
    if (!alertText) return;
    try {
      await api.post('/alert', { message: alertText });
      Alert.alert("Succès", "Alerte mise à jour sur l'accueil !");
      setAlertText('');
    } catch (e) { Alert.alert("Erreur", "Mise à jour impossible."); }
  };

  const saveHeroBg = async () => {
    try {
      await api.post('/hero-bg', { image_url: heroBg });
      Alert.alert("Succès", "Image de fond mise à jour !");
    } catch (e) { Alert.alert("Erreur", "Mise à jour impossible."); }
  };

  const saveCarousel = async () => {
    try {
      await api.post('/carousel', { items: carouselItems });
      Alert.alert("Succès", "Carrousel sauvegardé !");
    } catch (e) { Alert.alert("Erreur", "Mise à jour impossible."); }
  };

  const moveProduct = (index: number, direction: 'up' | 'down') => {
    const newItems = [...topProducts];
    if (direction === 'up' && index > 0) {
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
    }
    setTopProducts(newItems);
  };

  // --- CALCUL TENDANCES ---
  const calcTrend = (current: number, last: number) => {
    if (last === 0 && current > 0) return "+100%";
    if (last === 0) return "+0%";
    const diff = ((current - last) / last) * 100;
    return (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Chargement du QG...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnBackNav}>
          <Feather name="arrow-left" size={24} color="#A0A0A0" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>DASHBOARD ADMIN</Text>
          <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>Connecté</Text></View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* ALERTE STOCK */}
        {outOfStock.length > 0 && (
          <View style={styles.alertStockBox}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <Feather name="alert-triangle" size={24} color="#FF3B3B" />
              <View>
                <Text style={styles.alertStockTitle}>Rupture de stock détectée</Text>
                <Text style={styles.alertStockDesc}>{outOfStock.length} service(s) épuisé(s).</Text>
              </View>
            </View>
          </View>
        )}

        {/* WIDGET : BANNIÈRE D'ALERTE */}
        <View style={styles.widget}>
          <Text style={styles.widgetTitle}><Feather name="megaphone" size={18} color="#06b6d4"/> Bannière d'Alerte</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: PROMO FLASH -50% !" 
            placeholderTextColor="#555" 
            value={alertText} 
            onChangeText={setAlertText} 
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={updateAlert}>
            <Feather name="save" size={16} color="#0B0E14" />
            <Text style={styles.btnPrimaryText}>Mettre à jour</Text>
          </TouchableOpacity>
        </View>

        {/* WIDGET : IMAGE HERO */}
        <View style={styles.widget}>
          <Text style={styles.widgetTitle}><Feather name="image" size={18} color="#06b6d4"/> Image de fond (URL)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="https://..." 
            placeholderTextColor="#555" 
            value={heroBg} 
            onChangeText={setHeroBg} 
          />
          <TouchableOpacity style={styles.btnPrimary} onPress={saveHeroBg}>
            <Feather name="save" size={16} color="#0B0E14" />
            <Text style={styles.btnPrimaryText}>Sauvegarder l'image</Text>
          </TouchableOpacity>
        </View>

        {/* STATISTIQUES (KPIs cliquables) */}
        <View style={styles.kpiGrid}>
          <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/admin/users')}>
            <Feather name="users" size={20} color="#60A5FA" style={{marginBottom: 8}}/>
            <Text style={styles.kpiLabel}>Utilisateurs</Text>
            <Text style={styles.kpiValue}>{stats.users}</Text>
            <Text style={styles.kpiTrend}>{calcTrend(stats.usersThisMonth, stats.usersLastMonth)}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/admin/orders')}>
            <Feather name="shopping-cart" size={20} color="#34D399" style={{marginBottom: 8}}/>
            <Text style={styles.kpiLabel}>Commandes</Text>
            <Text style={styles.kpiValue}>{stats.orders}</Text>
            <Text style={styles.kpiTrend}>{calcTrend(stats.ordersThisMonth, stats.ordersLastMonth)}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/admin/messages')}>
            <Feather name="message-square" size={20} color="#FBBF24" style={{marginBottom: 8}}/>
            <Text style={styles.kpiLabel}>Support / Chat</Text>
            <Text style={styles.kpiValue}>Gérer</Text>
            <Text style={[styles.kpiTrend, {color: '#FBBF24'}]}>Répondre aux clients</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.kpiCard} onPress={() => router.push('/admin/products')}>
            <Feather name="activity" size={20} color="#A78BFA" style={{marginBottom: 8}}/>
            <Text style={styles.kpiLabel}>Catalogue / Services</Text>
            <Text style={styles.kpiValue}>{stats.activeProducts}/{stats.totalProducts}</Text>
            <Text style={[styles.kpiTrend, {color: '#A78BFA'}]}>Gérer les produits</Text>
          </TouchableOpacity>
        </View>

        {/* WIDGET : GRAPHIQUE DES VENTES (Natifs) */}
        <View style={styles.widget}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
            <Text style={styles.widgetTitle}><Feather name="bar-chart-2" size={18} color="#06b6d4"/> Évolution</Text>
            <TouchableOpacity onPress={() => setChartMode(chartMode === 'orders' ? 'revenue' : 'orders')} style={styles.toggleBtn}>
              <Text style={styles.toggleBtnText}>{chartMode === 'orders' ? 'VOIR REVENUS' : 'VOIR COMMANDES'}</Text>
            </TouchableOpacity>
          </View>

          {/* Bar Chart 100% Native */}
          <View style={styles.chartContainer}>
            {monthlyChartData.map((d, i) => {
              const val = chartMode === 'orders' ? d.orders : d.revenue;
              const maxVal = Math.max(...monthlyChartData.map(m => chartMode === 'orders' ? m.orders : m.revenue), 1);
              const heightPct = (val / maxVal) * 100;

              return (
                <View key={i} style={styles.chartBarWrapper}>
                  <View style={[styles.chartBar, { height: `${Math.max(5, heightPct)}%`, backgroundColor: d.isCurrent ? '#06b6d4' : 'rgba(255,255,255,0.2)' }]} />
                  <Text style={styles.chartLabel} numberOfLines={1}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* WIDGET : ACTIVITÉ RÉCENTE */}
        <View style={styles.widget}>
          <Text style={styles.widgetTitle}><Feather name="trending-up" size={18} color="#06b6d4"/> Activité Récente</Text>
          {recentActivity.map(order => (
            <View key={order.id} style={styles.activityRow}>
              <View style={styles.activityIcon}><Feather name="shopping-cart" size={14} color="#06b6d4"/></View>
              <View style={{flex: 1}}>
                <Text style={styles.activityTitle}>Commande #{String(order.id).substring(0,6)}</Text>
                <Text style={styles.activityDate}>{new Date(order.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.activityPrice}>+{Number(order.total_amount || order.total || 0).toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        {/* WIDGET : ORDRE TOP PRODUITS */}
        <View style={styles.widget}>
          <Text style={styles.widgetTitle}><Feather name="star" size={18} color="#F5A623"/> Top Produits (Ordre)</Text>
          {topProducts.map((prod, idx) => (
            <View key={prod.name} style={styles.sortRow}>
              <View>
                <Text style={styles.sortTitle}>{prod.name}</Text>
                <Text style={styles.sortCat}>{prod.category}</Text>
              </View>
              <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity onPress={() => moveProduct(idx, 'up')} disabled={idx === 0} style={{padding: 4, opacity: idx === 0 ? 0.3 : 1}}>
                  <Feather name="arrow-up" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveProduct(idx, 'down')} disabled={idx === topProducts.length - 1} style={{padding: 4, opacity: idx === topProducts.length - 1 ? 0.3 : 1}}>
                  <Feather name="arrow-down" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  centerContainer: { flex: 1, backgroundColor: '#0B0E14', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#06b6d4', marginTop: 12, fontWeight: 'bold' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B' },
  btnBackNav: { padding: 8, marginRight: 8 },
  headerTitleBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'black', letterSpacing: 1 },
  adminBadge: { backgroundColor: 'rgba(6, 182, 212, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.3)' },
  adminBadgeText: { color: '#06b6d4', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },

  scrollContent: { padding: 20, paddingBottom: 60 },

  alertStockBox: { backgroundColor: 'rgba(255, 59, 59, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 59, 59, 0.3)', padding: 16, borderRadius: 16, marginBottom: 20 },
  alertStockTitle: { color: '#FF3B3B', fontWeight: 'bold', fontSize: 14 },
  alertStockDesc: { color: '#A0A0A0', fontSize: 12, marginTop: 4 },

  widget: { backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 20, padding: 20, marginBottom: 20 },
  widgetTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  
  input: { backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, paddingHorizontal: 16, height: 48, color: '#fff', marginBottom: 12 },
  btnPrimary: { backgroundColor: '#06b6d4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12 },
  btnPrimaryText: { color: '#0B0E14', fontWeight: 'black', fontSize: 14 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCard: { width: (width - 52) / 2, backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 16, padding: 16 },
  kpiLabel: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  kpiValue: { color: '#fff', fontSize: 24, fontWeight: 'black', fontFamily: 'monospace' },
  kpiTrend: { color: '#00FF94', fontSize: 10, fontWeight: 'bold', marginTop: 4 },

  toggleBtn: { backgroundColor: 'rgba(6, 182, 212, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  toggleBtnText: { color: '#06b6d4', fontSize: 10, fontWeight: 'bold' },

  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#2D333B' },
  chartBarWrapper: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  chartBar: { width: 12, borderRadius: 4, marginBottom: 8 },
  chartLabel: { color: '#A0A0A0', fontSize: 8, textTransform: 'uppercase' },

  activityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', padding: 12, borderRadius: 12, marginBottom: 8 },
  activityIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(6, 182, 212, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityTitle: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  activityDate: { color: '#555', fontSize: 10 },
  activityPrice: { color: '#06b6d4', fontSize: 14, fontWeight: 'bold', fontFamily: 'monospace' },

  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0B0E14', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2D333B' },
  sortTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  sortCat: { color: '#555', fontSize: 10, textTransform: 'uppercase', marginTop: 4 },
});