import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Linking, SafeAreaView 
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCart } from '../app/context/CartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function CartScreen() {
  const router = useRouter();
  const { cart, updateQuantity, updateDuration, removeFromCart, cartTotal, cartCount } = useCart();
  
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- GESTION COUPON ---
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponMessage, setCouponMessage] = useState({ type: '', text: '' });
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Vérifie si l'utilisateur est connecté au montage
  useEffect(() => {
    const checkUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) setUser(JSON.parse(userData));
    };
    checkUser();
  }, []);

  const hasUnavailableItems = cart.some(item => item.stock_virtuel === 0);

  // --- LOGIQUE COUPON ---
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponMessage({ type: '', text: '' });

    try {
      const res = await api.get(`/coupons/validate/${couponCode}`);
      const data = res.data;
      
      if (data.valid) {
        setAppliedCoupon({ code: data.code, discount: data.discount_percentage });
        setCouponMessage({ type: 'success', text: `Code appliqué ! -${data.discount_percentage}%` });
      } else {
        setCouponMessage({ type: 'error', text: data.message || 'Code invalide ou expiré.' });
      }
    } catch (err: any) {
      setCouponMessage({ type: 'error', text: err.response?.data?.message || 'Erreur lors de la vérification.' });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponMessage({ type: '', text: '' });
  };

  // --- CALCULS ---
  const discountAmount = appliedCoupon ? cartTotal * (appliedCoupon.discount / 100) : 0;
  const subtotalAfterDiscount = cartTotal - discountAmount;
  const vat = subtotalAfterDiscount * 0.20;
  const totalTTC = subtotalAfterDiscount + vat;

  // --- CHECKOUT STRIPE ---
  const handleCheckout = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post('/orders', {
        userId: user.id,
        cart: cart,
        total: subtotalAfterDiscount,
        coupon: appliedCoupon
      });

      const data = response.data;

      if (data.checkoutUrl) {
        // Ouvre la page Stripe dans le navigateur du téléphone
        await Linking.openURL(data.checkoutUrl);
      } else {
        Alert.alert("Erreur", "Aucune URL de paiement retournée.");
      }
    } catch (error: any) {
      Alert.alert("Erreur de paiement", error.response?.data?.message || "Impossible d'initialiser le paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // UI - ÉTAT VIDE
  // ==========================================
  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        {/* NOUVEAU : Bouton retour même quand le panier est vide */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <Feather name="arrow-left" size={20} color="#A0A0A0" />
          </TouchableOpacity>
        </View>

        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Feather name="box" size={40} color="#64748b" />
          </View>
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptySubtitle}>
            Explorez notre catalogue de solutions SaaS et sécurisez votre infrastructure dès aujourd'hui.
          </Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/category')}>
            <Text style={styles.btnPrimaryText}>PARCOURIR LE CATALOGUE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // UI - PANIER REMPLI
  // ==========================================
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* EN-TÊTE */}
        <View style={[styles.header, { alignItems: 'center' }]}>
          {/* NOUVEAU : Bouton retour */}
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8, padding: 4 }}>
            <Feather name="arrow-left" size={28} color="#A0A0A0" />
          </TouchableOpacity>
          
          <Text style={styles.pageTitle}>Votre Panier</Text>
          <View style={[styles.badgeCount, { marginBottom: 0 }]}>
            <Text style={styles.badgeCountText}>{cartCount} service{cartCount > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* LISTE DES ARTICLES */}
        <View style={styles.cartList}>
          {cart.map((item) => {
            const isAvailable = item.stock_virtuel > 0;
            const itemTotal = item.price * item.quantity * (item.duration === 'yearly' ? 12 : 1);

            return (
              <View key={item.id} style={[styles.cartItem, !isAvailable && styles.cartItemUnavailable]}>
                
                <View style={styles.itemTopRow}>
                  <View style={styles.itemIconBox}>
                    <Feather name={isAvailable ? "shield" : "alert-triangle"} size={24} color={isAvailable ? "#06b6d4" : "#FF3B3B"} />
                  </View>
                  
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    {isAvailable ? (
                      <View style={styles.statusRow}>
                        <View style={styles.dotGreen} />
                        <Text style={styles.statusTextGreen}>DISPONIBLE</Text>
                      </View>
                    ) : (
                      <Text style={styles.statusTextRed}>STOCK ÉPUISÉ</Text>
                    )}
                  </View>

                  <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.btnRemove}>
                    <Feather name="trash-2" size={18} color="#FF3B3B" />
                  </TouchableOpacity>
                </View>

                {/* CONTRÔLES (Durée & Quantité) */}
                <View style={styles.controlsRow}>
                  
                  {/* Bascule Durée (Mobile friendly) */}
                  <TouchableOpacity 
                    style={styles.durationToggle}
                    disabled={!isAvailable}
                    onPress={() => updateDuration(item.id, item.duration === 'monthly' ? 'yearly' : 'monthly')}
                  >
                    <Text style={styles.durationToggleText}>
                      {item.duration === 'monthly' ? 'Mensuel' : 'Annuel (-20%)'}
                    </Text>
                    <Feather name="refresh-cw" size={12} color="#06b6d4" />
                  </TouchableOpacity>

                  {/* Boutons Quantité (Mobile friendly) */}
                  <View style={styles.quantityControl}>
                    <TouchableOpacity 
                      style={styles.qtyBtn} 
                      disabled={!isAvailable || item.quantity <= 1}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Feather name="minus" size={16} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity 
                      style={styles.qtyBtn} 
                      disabled={!isAvailable}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Feather name="plus" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>

                </View>

                {/* PRIX */}
                <View style={styles.itemFooter}>
                  <Text style={styles.itemUnitPrice}>{item.price} € / u.</Text>
                  <Text style={styles.itemTotalPrice}>{itemTotal.toFixed(2)} €</Text>
                </View>

              </View>
            );
          })}
        </View>

        {/* RÉSUMÉ DE COMMANDE */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé de la commande</Text>

          {/* CODE PROMO */}
          <View style={styles.couponSection}>
            <Text style={styles.couponLabel}><Feather name="tag" size={12} /> CODE PROMOTIONNEL</Text>
            <View style={styles.couponInputRow}>
              <TextInput
                style={[styles.couponInput, appliedCoupon && styles.couponInputDisabled]}
                placeholder="Ex: CYNA20"
                placeholderTextColor="#555"
                value={couponCode}
                onChangeText={setCouponCode}
                editable={!appliedCoupon}
                autoCapitalize="characters"
              />
              {!appliedCoupon ? (
                <TouchableOpacity 
                  style={[styles.couponBtn, (!couponCode || isApplyingCoupon) && styles.couponBtnDisabled]}
                  disabled={!couponCode || isApplyingCoupon}
                  onPress={handleApplyCoupon}
                >
                  {isApplyingCoupon ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.couponBtnText}>Appliquer</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.couponBtnRemove} onPress={handleRemoveCoupon}>
                  <Feather name="x" size={18} color="#FF3B3B" />
                </TouchableOpacity>
              )}
            </View>
            {couponMessage.text ? (
              <Text style={[styles.couponMessage, couponMessage.type === 'error' ? {color: '#FF3B3B'} : {color: '#00FF94'}]}>
                {couponMessage.text}
              </Text>
            ) : null}
          </View>

          {/* TOTAUX */}
          <View style={styles.totalsSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Sous-total HT</Text>
              <Text style={styles.totalValue}>{cartTotal.toFixed(2)} €</Text>
            </View>
            {appliedCoupon && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelDiscount}>Réduction ({appliedCoupon.code})</Text>
                <Text style={styles.totalValueDiscount}>- {discountAmount.toFixed(2)} €</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TVA (20%)</Text>
              <Text style={styles.totalValue}>{vat.toFixed(2)} €</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.totalRow}>
              <Text style={styles.totalTtcLabel}>Total TTC</Text>
              <Text style={styles.totalTtcValue}>{totalTTC.toFixed(2)} €</Text>
            </View>
          </View>

          {/* BOUTON PAIEMENT */}
          <TouchableOpacity 
            style={[styles.btnCheckout, (hasUnavailableItems || isSubmitting) && styles.btnCheckoutDisabled]}
            disabled={hasUnavailableItems || isSubmitting}
            onPress={handleCheckout}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0B0E14" />
            ) : hasUnavailableItems ? (
              <Text style={styles.btnCheckoutTextDisabled}>PANIER INVALIDE (STOCK)</Text>
            ) : (
              <>
                <Text style={styles.btnCheckoutText}>PROCÉDER AU PAIEMENT</Text>
                <Feather name="arrow-right" size={18} color="#0B0E14" />
              </>
            )}
          </TouchableOpacity>

          {/* WARNING AUTHENTIFICATION */}
          {!user && (
            <View style={styles.authWarning}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4}}>
                <Feather name="lock" size={12} color="#06b6d4" style={{marginRight: 6}} />
                <Text style={styles.authWarningTitle}>Authentification requise</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.authWarningLink}>Connectez-vous pour finaliser</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E14' },
  scrollContent: { padding: 20, paddingBottom: 60 },
  
  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIconBox: { width: 80, height: 80, backgroundColor: '#1C2128', borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  emptySubtitle: { color: '#A0A0A0', fontSize: 14, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  btnPrimary: { backgroundColor: '#06b6d4', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, elevation: 5 },
  btnPrimaryText: { color: '#0B0E14', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  // Header
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: 'black', color: '#fff' },
  badgeCount: { backgroundColor: 'rgba(6, 182, 212, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 4 },
  badgeCountText: { color: '#06b6d4', fontSize: 12, fontWeight: 'bold' },

  // Cart List
  cartList: { marginBottom: 30 },
  cartItem: { backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 16, padding: 16, marginBottom: 16 },
  cartItemUnavailable: { opacity: 0.6, borderColor: 'rgba(255, 59, 59, 0.3)' },
  
  itemTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  itemIconBox: { width: 50, height: 50, backgroundColor: '#0B0E14', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  dotGreen: { width: 6, height: 6, backgroundColor: '#00FF94', borderRadius: 3, marginRight: 6 },
  statusTextGreen: { color: '#00FF94', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  statusTextRed: { color: '#FF3B3B', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  btnRemove: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 8 },

  controlsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  durationToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 8, paddingVertical: 10 },
  durationToggleText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 8 },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  qtyText: { color: '#fff', fontSize: 14, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },

  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  itemUnitPrice: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  itemTotalPrice: { color: '#06b6d4', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace' },

  // Summary
  summaryCard: { backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 24, padding: 20 },
  summaryTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  
  couponSection: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 20, marginBottom: 20 },
  couponLabel: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 10 },
  couponInputRow: { flexDirection: 'row', gap: 10 },
  couponInput: { flex: 1, backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 8, paddingHorizontal: 16, color: '#fff', fontSize: 14, fontFamily: 'monospace' },
  couponInputDisabled: { opacity: 0.5 },
  couponBtn: { backgroundColor: '#2D333B', paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  couponBtnDisabled: { opacity: 0.5 },
  couponBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  couponBtnRemove: { backgroundColor: 'rgba(255, 59, 59, 0.1)', paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  couponMessage: { fontSize: 12, fontWeight: 'bold', marginTop: 10 },

  totalsSection: { marginBottom: 24 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  totalLabel: { color: '#A0A0A0', fontSize: 14, fontWeight: 'bold' },
  totalValue: { color: '#fff', fontSize: 14, fontFamily: 'monospace' },
  totalLabelDiscount: { color: '#00FF94', fontSize: 14, fontWeight: 'bold' },
  totalValueDiscount: { color: '#00FF94', fontSize: 14, fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: '#2D333B', marginVertical: 16 },
  totalTtcLabel: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  totalTtcValue: { color: '#06b6d4', fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace' },

  btnCheckout: { flexDirection: 'row', backgroundColor: '#06b6d4', paddingVertical: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnCheckoutDisabled: { backgroundColor: '#2D333B' },
  btnCheckoutText: { color: '#0B0E14', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  btnCheckoutTextDisabled: { color: '#64748b', fontWeight: '900', fontSize: 14, letterSpacing: 1 },

  authWarning: { backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 8, padding: 16, marginTop: 16, alignItems: 'center' },
  authWarningTitle: { color: '#A0A0A0', fontSize: 12, fontWeight: 'bold' },
  authWarningLink: { color: '#06b6d4', fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' }
});