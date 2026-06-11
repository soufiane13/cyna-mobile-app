import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// 1. IMPORTATION DU VRAI PANIER
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }: { product: any }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  
  // 2. RÉCUPÉRATION DE LA FONCTION D'AJOUT
  const { addToCart } = useCart();

  const isAvailable = product.stock_virtuel > 0;
  const nomAffiche = product.nom || product.name || 'Solution CYNA';
  const prixAffiche = parseFloat(product.prix || product.price || 0);
  const categorie = product.categorie || product.category || 'Service';

  // 3. LA VRAIE FONCTION D'AJOUT (comme sur le Web)
  const handleAddToCart = () => {
    // On envoie le produit avec ses paramètres par défaut
    addToCart({ 
      ...product, 
      name: nomAffiche, 
      price: prixAffiche, 
      quantity: 1, 
      duration: 'monthly' 
    });
    
    // Animation visuelle du bouton (passe au vert pendant 1.5s)
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <View style={[styles.card, !isAvailable && styles.cardUnavailable]}>
      {/* --- ZONE IMAGE --- */}
      <View style={styles.imageContainer}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="shield" size={40} color="#06b6d4" style={{ opacity: 0.3 }} />
          </View>
        )}
        
        {/* Badge Catégorie */}
        <View style={styles.badgeCategory}>
          <Text style={styles.badgeCategoryText}>{categorie}</Text>
        </View>

        {/* Badge Rupture */}
        {!isAvailable && (
          <View style={styles.badgeOutOfStock}>
            <Text style={styles.badgeOutOfStockText}>Rupture</Text>
          </View>
        )}
      </View>

      {/* --- ZONE INFOS --- */}
      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={2}>{nomAffiche}</Text>
        
        {product.description && (
          <Text style={styles.description} numberOfLines={2}>{product.description}</Text>
        )}

        {isAvailable ? (
          <View style={styles.availabilityRow}>
            <View style={styles.dotGreen} />
            <Text style={styles.textGreen}>DISPONIBLE</Text>
          </View>
        ) : (
          <Text style={styles.textRed}>INDISPONIBLE</Text>
        )}

        {/* Prix ou Devis */}
        <View style={styles.priceContainer}>
          {product.requires_quote ? (
            <View>
              <Text style={styles.priceLabel}>TARIFICATION</Text>
              <Text style={styles.priceValueQuote}>Sur devis</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.priceLabel}>À PARTIR DE</Text>
              <Text style={styles.priceValue}>{prixAffiche.toFixed(2)} € <Text style={styles.priceUnit}>/ mois</Text></Text>
            </View>
          )}
        </View>

        {/* Boutons d'action */}
        <View style={styles.actionRow}>
          {product.requires_quote ? (
            <TouchableOpacity 
              style={styles.btnQuote}
              onPress={() => router.push(`/product/${product.id}`)}
            >
              <Text style={styles.btnQuoteText}>DEMANDER UN DEVIS</Text>
              <Feather name="arrow-right" size={14} color="#F5A623" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.btnDetails}
                onPress={() => router.push(`/product/${product.id}`)}
              >
                <Text style={styles.btnDetailsText}>DÉTAILS</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.btnCart, !isAvailable && styles.btnCartDisabled, added && styles.btnCartAdded]}
                disabled={!isAvailable}
                onPress={handleAddToCart}
              >
                <Feather name={added ? "check" : "shopping-cart"} size={14} color={added ? "#00FF94" : "#06b6d4"} />
                <Text style={[styles.btnCartText, added && { color: '#00FF94' }]}>
                  {added ? "AJOUTÉ" : "AJOUTER"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1C2128', borderRadius: 16, borderWidth: 1, borderColor: '#2D333B', overflow: 'hidden', marginBottom: 20 },
  cardUnavailable: { opacity: 0.7 },
  imageContainer: { height: 160, backgroundColor: '#0B0E14', borderBottomWidth: 1, borderBottomColor: '#2D333B', position: 'relative' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgeCategory: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(11, 14, 20, 0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#06b6d4' },
  badgeCategoryText: { color: '#06b6d4', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  badgeOutOfStock: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(255, 59, 59, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 59, 59, 0.5)' },
  badgeOutOfStockText: { color: '#FF3B3B', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  infoContainer: { padding: 16 },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  description: { color: '#A0A0A0', fontSize: 12, marginBottom: 12, lineHeight: 18 },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dotGreen: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FF94', marginRight: 6 },
  textGreen: { color: '#00FF94', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  textRed: { color: '#FF3B3B', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 16 },
  priceContainer: { marginBottom: 16 },
  priceLabel: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 4 },
  priceValue: { color: '#06b6d4', fontSize: 20, fontWeight: 'bold' },
  priceValueQuote: { color: '#F5A623', fontSize: 20, fontWeight: 'bold' },
  priceUnit: { color: '#A0A0A0', fontSize: 12, fontWeight: 'normal' },
  actionRow: { flexDirection: 'row', gap: 10 },
  btnQuote: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(245, 166, 35, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 166, 35, 0.3)', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnQuoteText: { color: '#F5A623', fontSize: 12, fontWeight: '900' },
  btnDetails: { flex: 1, borderWidth: 1, borderColor: '#2D333B', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnDetailsText: { color: '#A0A0A0', fontSize: 12, fontWeight: '900' },
  btnCart: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.3)', paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnCartDisabled: { backgroundColor: '#2D333B', borderColor: '#2D333B' },
  btnCartAdded: { backgroundColor: 'rgba(0, 255, 148, 0.1)', borderColor: 'rgba(0, 255, 148, 0.3)' },
  btnCartText: { color: '#06b6d4', fontSize: 12, fontWeight: '900' },
});