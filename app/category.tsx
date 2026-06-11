import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../services/api';
import ProductCard from '../app/components/ProductCard';

// Équivalent de ton getCategoryInfo du web
const getCategoryInfo = (cat: string) => {
  switch(cat.toUpperCase()) {
    case 'EDR': 
      return { icon: 'shield', title: 'EDR (Endpoint)', desc: 'Protection avancée pour vos terminaux.' };
    case 'XDR': 
      return { icon: 'zap', title: 'XDR (Extended)', desc: 'Détection étendue sur votre infrastructure.' };
    case 'SOC': 
      return { icon: 'activity', title: 'SOC (Operations)', desc: 'Surveillance et réponse aux incidents 24/7.' };
    default: 
      return { icon: 'server', title: cat || 'Autres Services', desc: 'Solutions de cybersécurité additionnelles.' };
  }
};

export default function CategoryScreen() {
  const router = useRouter();
  const [groupedProducts, setGroupedProducts] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await api.get('/products');
        const products = res.data || [];
        
        // Grouper les produits par catégorie
        const grouped = products.reduce((acc: any, product: any) => {
          const cat = (product.categorie || product.category || 'Autres').toUpperCase();
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(product);
          return acc;
        }, {});
        
        setGroupedProducts(grouped);
      } catch (error) {
        console.error("Erreur chargement produits:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.iconBtn}>
          <Feather name="arrow-left" size={24} color="#A0A0A0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catalogue CYNA</Text>
        <TouchableOpacity onPress={() => router.push('/search')} style={styles.iconBtn}>
          <Feather name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroBlock}>
          <Text style={styles.heroTitle}>NOTRE CATALOGUE</Text>
          <Text style={styles.heroDesc}>
            Découvrez l'ensemble de nos solutions de cybersécurité pour protéger votre infrastructure.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#06b6d4" style={{ marginTop: 40 }} />
        ) : Object.keys(groupedProducts).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun service disponible pour le moment.</Text>
          </View>
        ) : (
          Object.entries(groupedProducts).map(([categoryName, items]: [string, any]) => {
            const info = getCategoryInfo(categoryName);
            
            return (
              <View key={categoryName} style={styles.categorySection}>
                
                {/* En-tête de la catégorie */}
                <View style={styles.catHeader}>
                  <View style={styles.catTitleRow}>
                    <Feather name={info.icon as any} size={24} color="#06b6d4" />
                    <Text style={styles.catTitle}>{info.title}</Text>
                  </View>
                  <Text style={styles.catDesc}>{info.desc}</Text>
                  <View style={styles.catCountBadge}>
                    <Text style={styles.catCountText}>{items.length} service(s)</Text>
                  </View>
                </View>

                {/* Liste horizontale des produits de cette catégorie */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                  {items.map((product: any) => (
                    <View key={product.id} style={styles.productWrapper}>
                      <ProductCard product={product} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2D333B' },
  iconBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  
  scrollContent: { paddingBottom: 60 },
  
  heroBlock: { padding: 20, alignItems: 'center', marginTop: 10 },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: 'black', marginBottom: 10, textAlign: 'center', letterSpacing: 1 },
  heroDesc: { color: '#A0A0A0', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },

  emptyCard: { backgroundColor: '#1C2128', padding: 30, margin: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2D333B' },
  emptyText: { color: '#A0A0A0', fontSize: 14 },

  categorySection: { marginTop: 30, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 30 },
  catHeader: { paddingHorizontal: 20, marginBottom: 20 },
  catTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  catTitle: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  catDesc: { color: '#A0A0A0', fontSize: 14, marginBottom: 12 },
  catCountBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  catCountText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },

  hScroll: { paddingHorizontal: 20, gap: 16 },
  productWrapper: { width: 300 }, // Fixe la largeur de la carte produit pour le scroll horizontal
});