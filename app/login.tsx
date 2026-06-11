import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView, ScrollView, Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen() {
  const router = useRouter();

  // ==========================================
  // 1. ÉTATS (DATA & UI)
  // ==========================================
  const [view, setView] = useState('login'); // 'login' | 'register' | 'forgot' | 'setup-2fa' | 'verify-2fa'
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    rememberMe: false
  });
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // ==========================================
  // 2. LOGIQUE MÉTIER
  // ==========================================
  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length > 7) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const getStrengthColor = (s: number) => {
    if (s <= 25) return '#FF3B3B'; // Rouge
    if (s <= 50) return '#F5A623'; // Orange
    return '#00FF94'; // Vert
  };

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg('');

    try {
      if (view === 'login') {
        const response = await api.post('/auth/login', { 
          email: formData.email, 
          password: formData.password 
        });
        const data = response.data;

        if (data.mfaSetupRequired) {
          setTempToken(data.token);
          // Appel avec le token temporaire dans le header
          const setupRes = await api.post('/auth/2fa/setup', {}, {
            headers: { Authorization: `Bearer ${data.token}` }
          });
          
          setFactorId(setupRes.data.factorId);
          setSecret(setupRes.data.secret);
          setView('setup-2fa');
          setSuccessMsg("Configuration requise : Ajoutez la clé à votre application.");
          return;
        }

        if (data.mfaRequired) {
          setTempToken(data.token);
          setFactorId(data.factorId);
          setView('verify-2fa');
          setSuccessMsg("Sécurité renforcée : Entrez votre code 2FA.");
          return;
        }

        // Connexion standard réussie
        await AsyncStorage.setItem('userToken', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        router.replace('/'); 
      } 
      else if (view === 'setup-2fa' || view === 'verify-2fa') {
        const verifyRes = await api.post('/auth/2fa/verify', 
          { factorId, code: twoFaCode },
          { headers: { Authorization: `Bearer ${tempToken}` } }
        );
        
        // Vérification 2FA réussie
        await AsyncStorage.setItem('userToken', tempToken || '');
        await AsyncStorage.setItem('user', JSON.stringify(verifyRes.data.user));
        router.replace('/');
      }
      else if (view === 'register') {
        await api.post('/auth/register', { 
          email: formData.email, 
          password: formData.password, 
          fullName: formData.fullName 
        });
        
        setSuccessMsg("Compte sécurisé créé ! Redirection...");
        setTimeout(() => {
          setView('login');
          setSuccessMsg('');
        }, 2000);
      }
      else if (view === 'forgot') {
        await api.post('/auth/reset-password', { email: formData.email });
        setSuccessMsg("Lien de réinitialisation sécurisé envoyé !");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 3. COMPOSANTS RÉUTILISABLES
  // ==========================================
  const renderInput = (label: string, name: string, placeholder: string, iconName: any, isSecure = false) => (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {name === 'password' && view === 'login' && (
          <TouchableOpacity onPress={() => { setView('forgot'); setError(null); }}>
            <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.inputContainer, error && styles.inputError]}>
        <Feather name={iconName} size={18} color="#A0A0A0" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#555"
          value={(formData as any)[name]}
          onChangeText={(text) => handleChange(name, text)}
          secureTextEntry={isSecure && !showPassword}
          keyboardType={name === 'email' ? 'email-address' : 'default'}
          autoCapitalize="none"
        />
        {name === 'password' && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#A0A0A0" />
          </TouchableOpacity>
        )}
      </View>

      {/* Barre de force de mot de passe (Inscription) */}
      {view === 'register' && name === 'password' && formData.password.length > 0 && (
        <View style={styles.strengthBarContainer}>
          <View style={[
            styles.strengthBarFill, 
            { width: `${passwordStrength}%`, backgroundColor: getStrengthColor(passwordStrength) }
          ]} />
        </View>
      )}
    </View>
  );

  // ==========================================
  // 4. RENDU UI
  // ==========================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#A0A0A0" />
            <Text style={styles.backText}>Retour</Text>
          </TouchableOpacity>

          {/* LOGO */}
          <View style={styles.headerContainer}>
            <View style={styles.logoBox}>
              <Feather name="shield" size={32} color="#06b6d4" />
            </View>
            <Text style={styles.brandTitle}>
              CYNA<Text style={styles.brandAccent}>DEFENSE</Text>
            </Text>
          </View>

          {/* CARTE PRINCIPALE */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {view === 'login' && "Portail d'accès"}
                {view === 'register' && "Créer une instance"}
                {view === 'forgot' && "Réinitialisation"}
                {view === 'setup-2fa' && "Configuration 2FA"}
                {view === 'verify-2fa' && "Vérification 2FA"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {view === 'login' && "Authentifiez-vous pour accéder à votre SOC."}
                {view === 'register' && "Rejoignez l'élite de la protection B2B."}
                {view === 'forgot' && "Un lien sécurisé vous sera envoyé."}
                {(view === 'setup-2fa' || view === 'verify-2fa') && "Sécurité administrateur requise."}
              </Text>
            </View>

            {/* MESSAGES */}
            {error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={18} color="#FF3B3B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {successMsg && (
              <View style={styles.successBox}>
                <Feather name="check" size={18} color="#00FF94" />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            {/* FORMULAIRE */}
            {view === 'register' && renderInput("Nom du Responsable", "fullName", "Ex: Jean Dupont", "user")}
            {(view === 'login' || view === 'register' || view === 'forgot') && renderInput("Adresse Email Pro", "email", "contact@entreprise.com", "mail")}
            {(view === 'login' || view === 'register') && renderInput("Clé d'accès", "password", "••••••••", "lock", true)}

            {/* 2FA SETUP (Affichage du Secret) */}
            {view === 'setup-2fa' && secret && (
              <View style={styles.secretBox}>
                <Text style={styles.secretTextWarning}>Impossible d'afficher le QR Code sur cette version.</Text>
                <Text style={styles.secretTextInstruction}>Saisissez cette clé manuellement dans Authy ou Google Authenticator :</Text>
                <View style={styles.secretKeyContainer}>
                  <Text style={styles.secretKey}>{secret}</Text>
                </View>
              </View>
            )}

            {/* 2FA VERIFY (Input Code) */}
            {(view === 'setup-2fa' || view === 'verify-2fa') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>CODE À 6 CHIFFRES</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.twoFaInput}
                    maxLength={6}
                    keyboardType="number-pad"
                    placeholder="000000"
                    placeholderTextColor="#555"
                    value={twoFaCode}
                    onChangeText={(text) => setTwoFaCode(text.replace(/[^0-9]/g, ''))}
                  />
                  <Feather name="smartphone" size={20} color="#A0A0A0" style={{position: 'absolute', right: 16}} />
                </View>
              </View>
            )}

            {/* BOUTON D'ACTION */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0B0E14" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {view === 'login' ? "S'AUTHENTIFIER" : view === 'register' ? "S'INSCRIRE" : view === 'forgot' ? "ENVOYER LE LIEN" : "VALIDER LE CODE"}
                </Text>
              )}
            </TouchableOpacity>

            {/* BASCULES FOOTER */}
            <View style={styles.footerLinks}>
              {view === 'login' ? (
                <Text style={styles.footerText}>Pas encore client ? <Text style={styles.footerLink} onPress={() => { setView('register'); setError(null); }}>Créer une instance</Text></Text>
              ) : view === 'setup-2fa' || view === 'verify-2fa' ? (
                <Text style={styles.footerText}><Text style={styles.footerLink} onPress={() => { setView('login'); setError(null); }}>Annuler et retourner à la connexion</Text></Text>
              ) : (
                <Text style={styles.footerText}>Déjà équipé ? <Text style={styles.footerLink} onPress={() => { setView('login'); setError(null); }}>S'authentifier</Text></Text>
              )}
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0E14' },
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 40, paddingBottom: 60, alignItems: 'center' },
  
  backBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 20 },
  backText: { color: '#A0A0A0', marginLeft: 8, fontSize: 14, fontWeight: 'bold' },
  
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  logoBox: { width: 60, height: 60, backgroundColor: 'rgba(6, 182, 212, 0.1)', borderWidth: 2, borderColor: '#06b6d4', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16, elevation: 10, shadowColor: '#06b6d4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  brandTitle: { color: '#ffffff', fontSize: 28, fontWeight: '900', fontStyle: 'italic', letterSpacing: 2, fontFamily: 'Organetto' }, // Application de la typographie Organetto
  brandAccent: { color: '#06b6d4' },
  
  card: { width: '100%', backgroundColor: '#1C2128', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#2D333B', elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  cardHeader: { alignItems: 'center', marginBottom: 30 },
  cardTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  cardSubtitle: { color: '#A0A0A0', fontSize: 13, textAlign: 'center' },
  
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255, 59, 59, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 59, 59, 0.3)', marginBottom: 20, gap: 10 },
  errorText: { color: '#FF3B3B', flex: 1, fontSize: 13, fontWeight: 'bold' },
  successBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(0, 255, 148, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 255, 148, 0.3)', marginBottom: 20, gap: 10 },
  successText: { color: '#00FF94', flex: 1, fontSize: 13, fontWeight: 'bold' },
  
  inputGroup: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  label: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, textTransform: 'uppercase' },
  forgotText: { color: '#06b6d4', fontSize: 12, fontWeight: 'bold' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', borderRadius: 12, borderWidth: 1, borderColor: '#2D333B', height: 52, paddingHorizontal: 16 },
  inputError: { borderColor: '#FF3B3B' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 15, height: '100%' },
  eyeIcon: { padding: 4 },
  
  strengthBarContainer: { height: 6, backgroundColor: '#0B0E14', borderRadius: 3, borderWidth: 1, borderColor: '#2D333B', marginTop: 10, overflow: 'hidden' },
  strengthBarFill: { height: '100%' },

  secretBox: { backgroundColor: '#0B0E14', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2D333B', marginBottom: 20, alignItems: 'center' },
  secretTextWarning: { color: '#F5A623', fontSize: 12, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  secretTextInstruction: { color: '#A0A0A0', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  secretKeyContainer: { backgroundColor: '#1C2128', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.3)' },
  secretKey: { color: '#06b6d4', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 16, letterSpacing: 3, fontWeight: 'bold' },

  twoFaInput: { flex: 1, color: '#fff', fontSize: 24, height: '100%', textAlign: 'center', letterSpacing: 10, fontWeight: 'bold' },
  
  submitButton: { backgroundColor: '#06b6d4', height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 5, shadowColor: '#06b6d4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  submitButtonDisabled: { backgroundColor: '#2D333B', shadowOpacity: 0, elevation: 0 },
  submitButtonText: { color: '#0B0E14', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  
  footerLinks: { marginTop: 30, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 20 },
  footerText: { color: '#A0A0A0', fontSize: 13, fontWeight: '500' },
  footerLink: { color: '#fff', fontWeight: 'bold', textDecorationLine: 'underline' }
});