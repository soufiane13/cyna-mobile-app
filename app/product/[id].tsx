import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, ActivityIndicator, Alert, Linking, SafeAreaView 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import api from '../../services/api';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États de configuration d'achat
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState<'monthly' | 'yearly'>('monthly');
  const [added, setAdded] = useState(false);

  // --- CHARGEMENT DU PRODUIT ---
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get('/products');
        const found = res.data.find((p: any) => String(p.id) === String(id));
        if (!found) throw new Error('Produit introuvable');
        setProduct(found);
      } catch (err) {
        setError('Produit introuvable ou erreur serveur.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // --- GESTION PANIER ---
  const handleAddToCart = () => {
    const nom = product.nom || product.name || 'Solution CYNA';
    const prix = parseFloat(product.prix || product.price || 0);
    
    addToCart({ 
      ...product, 
      name: nom, 
      price: prix, 
      quantity, 
      duration 
    });
    
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleRequestQuote = () => {
    const nom = product.nom || product.name || 'Produit inconnu';
    const emailSubject = `Demande de devis : ${nom}`;
    const emailBody = `Bonjour l'équipe CYNA,\n\nJe souhaite obtenir un devis pour la solution ${nom}.\nMerci de me recontacter.\n\nCordialement,`;
    Linking.openURL(`mailto:contact@cynadefense.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`);
  };

  // --- RENDUS DE CHARGEMENT ---
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centerContainer}>
        <Feather name="alert-circle" size={48} color="#FF3B3B" style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btnBack} onPress={() => router.back()}>
          <Feather name="arrow-left" size={16} color="#06b6d4" />
          <Text style={styles.btnBackText}>Retour au catalogue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- VARIABLES UTILES ---
  const nom = product.nom || product.name || 'Produit';
  const categorie = product.categorie || product.category || 'Service';
  const isAvailable = product.stock_virtuel > 0;
  
  const prix = parseFloat(product?.prix || product?.price || 0);
  const multiplier = duration === 'yearly' ? 12 * 0.80 : 1;
  const prixTotal = (prix * quantity * multiplier).toFixed(2);
  
  const features = product.features || product.caracteristiques || [
    "Support technique 24/7", "Mises à jour de sécurité incluses", "Déploiement sur site ou Cloud"
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER NAVIGATION */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnBackNav} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#A0A0A0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{nom}</Text>
        <TouchableOpacity style={styles.btnCartNav} onPress={() => router.push('/cart')}>
          <Feather name="shopping-cart" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- ZONE VISUELLE --- */}
        <View style={styles.imageBox}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Feather name="shield" size={64} color="#06b6d4" style={{ opacity: 0.2 }} />
            </View>
          )}
          <View style={styles.badgeCategory}>
            <Text style={styles.badgeCategoryText}>{categorie}</Text>
          </View>
          {!isAvailable && (
            <View style={styles.badgeOut}>
              <Text style={styles.badgeOutText}>Rupture</Text>
            </View>
          )}
        </View>

        {/* --- ZONE INFOS PRINCIPALES --- */}
        <View style={styles.infoSection}>
          <Text style={styles.productTitle}>{nom}</Text>
          
          {isAvailable ? (
            <View style={styles.statusRow}>
              <View style={styles.dotGreen} />
              <Text style={styles.statusTextGreen}>DISPONIBLE — ACTIVATION IMMÉDIATE</Text>
            </View>
          ) : (
            <Text style={styles.statusTextRed}>INDISPONIBLE ACTUELLEMENT</Text>
          )}

          <Text style={styles.description}>
            {product.description || "Sécurisez votre infrastructure avec les solutions CYNA Defense. Performance, fiabilité et protection de vos données sensibles garanties."}
          </Text>

          {/* CE QUI EST INCLUS */}
          <View style={styles.featuresBox}>
            <Text style={styles.featuresTitle}>CE QUI EST INCLUS</Text>
            {features.map((f: string, i: number) => (
              <View key={i} style={styles.featureRow}>
                <Feather name="check-circle" size={16} color="#06b6d4" style={{ marginTop: 2 }} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* --- ZONE D'ACHAT --- */}
        <View style={styles.purchaseSection}>
          {product.requires_quote ? (
            <View style={styles.quoteBox}>
              <Text style={styles.quoteTitle}>Tarification sur devis</Text>
              <Text style={styles.quoteDesc}>Cette solution nécessite une étude personnalisée de votre infrastructure.</Text>
              <TouchableOpacity style={styles.btnQuote} onPress={handleRequestQuote}>
                <Text style={styles.btnQuoteText}>CONTACTER L'ÉQUIPE</Text>
                <Feather name="mail" size={16} color="#F5A623" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* CONFIGURATION (Durée) */}
              <Text style={styles.configLabel}>DURÉE D'ABONNEMENT</Text>
              <View style={styles.durationRow}>
                <TouchableOpacity 
                  style={[styles.durationBtn, duration === 'monthly' && styles.durationBtnActive]}
                  onPress={() => setDuration('monthly')}
                >
                  <Text style={[styles.durationTitle, duration === 'monthly' && styles.durationTitleActive]}>Mensuel</Text>
                  <Text style={styles.durationSub}>Mois par mois</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.durationBtn, duration === 'yearly' && styles.durationBtnActive]}
                  onPress={() => setDuration('yearly')}
                >
                  <Text style={[styles.durationTitle, duration === 'yearly' && styles.durationTitleActive]}>Annuel</Text>
                  <Text style={styles.durationSub}>Économisez 20%</Text>
                </TouchableOpacity>
              </View>

              {/* CONFIGURATION (Quantité) */}
              <Text style={styles.configLabel}>NOMBRE DE LICENCES</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} disabled={quantity <= 1} onPress={() => setQuantity(q => q - 1)}>
                  <Feather name="minus" size={20} color={quantity <= 1 ? "#555" : "#fff"} />
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(q => q + 1)}>
                  <Feather name="plus" size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* TOTAL & BOUTON PANIER */}
              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>TOTAL {duration === 'yearly' ? 'ANNUEL' : 'MENSUEL'}</Text>
                  <Text style={styles.totalPrice}>{prixTotal} €</Text>
                  <Text style={styles.totalDetail}>
                    {prix.toFixed(2)} € × {quantity} licence(s) {duration === 'yearly' ? '× 12 mois − 20%' : '/ mois'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.btnAddToCart, !isAvailable && styles.btnAddToCartDisabled, added && styles.btnAddToCartAdded]}
                disabled={!isAvailable}
                onPress={handleAddToCart}
              >
                {added ? (
                  <>
                    <Feather name="check" size={18} color="#00FF94" />
                    <Text style={[styles.btnAddToCartText, {color: '#00FF94'}]}>AJOUTÉ AU PANIER</Text>
                  </>
                ) : (
                  <>
                    <Feather name="shopping-cart" size={18} color={!isAvailable ? "#666" : "#0B0E14"} />
                    <Text style={[styles.btnAddToCartText, !isAvailable && {color: '#666'}]}>
                      {!isAvailable ? 'STOCK ÉPUISÉ' : 'AJOUTER AU PANIER'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* BADGES DE CONFIANCE */}
          <View style={styles.trustBox}>
            <View style={styles.trustBadge}><Feather name="shield" size={12} color="#666" /><Text style={styles.trustText}>ISO 27001</Text></View>
            <View style={styles.trustBadge}><Feather name="lock" size={12} color="#666" /><Text style={styles.trustText}>GDPR</Text></View>
            <View style={styles.trustBadge}><Feather name="check-circle" size={12} color="#666" /><Text style={styles.trustText}>SLA 99.9%</Text></View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  centerContainer: { flex: 1, backgroundColor: '#0B0E14', justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  btnBack: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: 8 },
  btnBackText: { color: '#06b6d4', fontWeight: 'bold' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B' },
  btnBackNav: { padding: 8 },
  headerTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginHorizontal: 16 },
  btnCartNav: { padding: 8 },

  scrollContent: { paddingBottom: 40 },
  
  imageBox: { width: '100%', height: 280, backgroundColor: '#1C2128', position: 'relative' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  badgeCategory: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(11, 14, 20, 0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#06b6d4' },
  badgeCategoryText: { color: '#06b6d4', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  badgeOut: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255, 59, 59, 0.9)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeOutText: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },

  infoSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#2D333B' },
  productTitle: { color: '#fff', fontSize: 28, fontWeight: 'black', marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF94', marginRight: 8 },
  statusTextGreen: { color: '#00FF94', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  statusTextRed: { color: '#FF3B3B', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 16 },
  description: { color: '#A0A0A0', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  
  featuresBox: { backgroundColor: '#1C2128', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#2D333B' },
  featuresTitle: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  featureText: { color: '#fff', fontSize: 13, flex: 1 },

  purchaseSection: { padding: 20 },
  configLabel: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  
  durationRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  durationBtn: { flex: 1, backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', padding: 16, borderRadius: 12 },
  durationBtnActive: { backgroundColor: 'rgba(6, 182, 212, 0.1)', borderColor: '#06b6d4' },
  durationTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  durationTitleActive: { color: '#06b6d4' },
  durationSub: { color: '#A0A0A0', fontSize: 11 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, alignSelf: 'flex-start' },
  qtyBtn: { padding: 16 },
  qtyValue: { color: '#fff', fontSize: 18, fontWeight: 'bold', minWidth: 40, textAlign: 'center' },

  divider: { height: 1, backgroundColor: '#2D333B', my: 24 },

  totalRow: { marginBottom: 20 },
  totalLabel: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  totalPrice: { color: '#06b6d4', fontSize: 32, fontWeight: 'black', fontFamily: 'monospace' },
  totalDetail: { color: '#666', fontSize: 11, marginTop: 4 },

  btnAddToCart: { flexDirection: 'row', backgroundColor: '#06b6d4', paddingVertical: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnAddToCartDisabled: { backgroundColor: '#2D333B' },
  btnAddToCartAdded: { backgroundColor: 'rgba(0, 255, 148, 0.1)', borderWidth: 1, borderColor: '#00FF94' },
  btnAddToCartText: { color: '#0B0E14', fontSize: 14, fontWeight: 'black', letterSpacing: 1 },

  quoteBox: { backgroundColor: 'rgba(245, 166, 35, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 166, 35, 0.3)', padding: 20, borderRadius: 16, alignItems: 'center' },
  quoteTitle: { color: '#F5A623', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  quoteDesc: { color: '#A0A0A0', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  btnQuote: { flexDirection: 'row', backgroundColor: '#F5A623', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center', gap: 10 },
  btnQuoteText: { color: '#0B0E14', fontSize: 12, fontWeight: 'black' },

  trustBox: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 24 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { color: '#666', fontSize: 10, fontWeight: 'bold' }
});