import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Définition des types ---
export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  quantity: number;
  duration: 'monthly' | 'yearly';
  image_url?: string;
  [key: string]: any; // Pour accepter d'autres propriétés du produit
}

interface CartContextProps {
  cart: CartItem[];
  addToCart: (product: any) => void;
  updateQuantity: (productId: string | number, newQuantity: number) => void;
  updateDuration: (productId: string | number, newDuration: 'monthly' | 'yearly') => void;
  removeFromCart: (productId: string | number) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  isCartLoaded: boolean;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false); // État crucial pour le mobile

  // 1. CHARGEMENT INITIAL DEPUIS LE COFFRE-FORT MOBILE
  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem('cyna_cart');
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error("Erreur lors du chargement du panier :", error);
      } finally {
        setIsCartLoaded(true); // Indique que la lecture est terminée
      }
    };
    loadCart();
  }, []);

  // 2. SAUVEGARDE AUTOMATIQUE À CHAQUE MODIFICATION
  useEffect(() => {
    // Ne sauvegarde que si le chargement initial est terminé (évite d'écraser le panier par [] au démarrage)
    if (isCartLoaded) {
      AsyncStorage.setItem('cyna_cart', JSON.stringify(cart)).catch(error => 
        console.error("Erreur lors de la sauvegarde du panier :", error)
      );
    }
  }, [cart, isCartLoaded]);

  // --- LOGIQUE MÉTIER IDENTIQUE AU WEB ---

  const addToCart = (product: any) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + (product.quantity ?? 1),
                duration: product.duration ?? item.duration,
              }
            : item
        );
      }
      
      return [...prevCart, {
        ...product,
        quantity: product.quantity ?? 1,
        duration: product.duration ?? 'monthly',
      }];
    });
  };

  const updateQuantity = (productId: string | number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const updateDuration = (productId: string | number, newDuration: 'monthly' | 'yearly') => {
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId ? { ...item, duration: newDuration } : item
      )
    );
  };

  const removeFromCart = (productId: string | number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  // Ajout d'une fonction pour vider le panier après un paiement réussi
  const clearCart = () => {
    setCart([]);
  };

  // CALCULS
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const cartTotal = cart.reduce((total, item) => {
    const multiplier = item.duration === 'yearly' ? 12 : 1;
    return total + (item.price * item.quantity * multiplier);
  }, 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      updateQuantity,
      updateDuration,
      removeFromCart,
      clearCart,
      cartCount,
      cartTotal,
      isCartLoaded
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart doit être utilisé à l\'intérieur d\'un CartProvider');
  }
  return context;
};