import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, SafeAreaView, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';

export default function AdminMessagesScreen() {
  const router = useRouter();

  // --- ÉTATS ---
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Email Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '', messageId: null as string | null });
  const [sendingEmail, setSendingEmail] = useState(false);

  // --- CHARGEMENT ---
  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages');
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les messages.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIQUE MESSAGE ---
  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/messages/${id}/status`, { status });
      setMessages(messages.map(m => m.id === id ? { ...m, status } : m));
    } catch (err) {
      Alert.alert("Erreur", "Impossible de mettre à jour le statut.");
    }
  };

  const openReplyModal = (msg: any) => {
    setEmailData({
      to: msg.contact_info,
      subject: 'RE: Votre demande au support CYNA Defense',
      message: `\n\n\n------------------------------\nVotre message d'origine :\n${msg.message}`,
      messageId: msg.id
    });
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
      Alert.alert("Succès", "Réponse envoyée avec succès !");
      setIsEmailModalOpen(false);
      if (emailData.messageId) {
        updateStatus(emailData.messageId, 'replied');
      }
    } catch (e) {
      Alert.alert("Erreur", "Échec de l'envoi.");
    } finally {
      setSendingEmail(false);
    }
  };

  // --- FILTRES ---
  const filteredMessages = messages.filter(m => 
    (m.contact_info || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.message || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.btnBack}>
            <Feather name="arrow-left" size={24} color="#A0A0A0" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Support</Text>
            <Text style={styles.headerSubtitle}>{filteredMessages.filter(m => m.status === 'unread').length} nouveau(x)</Text>
          </View>
          <TouchableOpacity onPress={fetchMessages} disabled={loading} style={styles.btnRefresh}>
            {loading ? <ActivityIndicator size="small" color="#06b6d4" /> : <Feather name="refresh-cw" size={20} color="#06b6d4" />}
          </TouchableOpacity>
        </View>
      </View>

      {/* RECHERCHE FIXE EN HAUT */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#A0A0A0" style={{ marginLeft: 12 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Rechercher (Email, Contenu)..."
            placeholderTextColor="#555"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#06b6d4" />
          </View>
        ) : filteredMessages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="message-square" size={40} color="#2D333B" style={{marginBottom: 16}} />
            <Text style={styles.emptyText}>Aucun message trouvé.</Text>
          </View>
        ) : (
          filteredMessages.map((msg) => {
            const isUnread = msg.status === 'unread';
            const isReplied = msg.status === 'replied';

            return (
              <View key={msg.id} style={[styles.msgCard, isUnread && styles.msgCardUnread]}>
                
                {/* En-tête du message */}
                <View style={styles.msgHeader}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1}}>
                    {isUnread && <View style={styles.unreadDot} />}
                    <View style={{flex: 1}}>
                      <Text style={styles.msgContact} numberOfLines={1}>{msg.contact_info}</Text>
                      <Text style={styles.msgAuthor}>{msg.user_name || 'Visiteur'} • {new Date(msg.created_at).toLocaleDateString()}</Text>
                    </View>
                  </View>

                  {/* Statut Badge */}
                  {isReplied ? (
                    <View style={styles.badgeReplied}><Text style={styles.badgeRepliedText}>TRAITÉ</Text></View>
                  ) : isUnread ? (
                    <View style={styles.badgeUnread}><Text style={styles.badgeUnreadText}>À TRAITER</Text></View>
                  ) : (
                    <View style={styles.badgeRead}><Text style={styles.badgeReadText}>LU</Text></View>
                  )}
                </View>

                {/* Corps du message */}
                <View style={styles.msgBodyBox}>
                  <Text style={styles.msgBodyText} numberOfLines={4}>{msg.message}</Text>
                </View>

                {/* Actions */}
                <View style={styles.msgFooter}>
                  {isUnread ? (
                    <TouchableOpacity onPress={() => updateStatus(msg.id, 'read')}>
                      <Text style={styles.markReadText}>Marquer comme lu</Text>
                    </TouchableOpacity>
                  ) : <View/>}
                  
                  <TouchableOpacity style={styles.btnReply} onPress={() => openReplyModal(msg)}>
                    <Feather name="mail" size={14} color="#0B0E14" />
                    <Text style={styles.btnReplyText}>Répondre</Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}
      </ScrollView>

      {/* MODALE DE RÉPONSE */}
      <Modal visible={isEmailModalOpen} transparent={true} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                <Feather name="send" size={20} color="#06b6d4" />
                <Text style={styles.modalTitle}>Répondre au client</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEmailModalOpen(false)} style={{padding: 4}}>
                <Feather name="x" size={24} color="#A0A0A0" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>DESTINATAIRE</Text>
                <View style={styles.fakeInput}>
                  <Text style={styles.fakeInputText} numberOfLines={1}>{emailData.to}</Text>
                </View>
              </View>
              
              <View>
                <Text style={styles.label}>SUJET</Text>
                <TextInput 
                  style={styles.input} 
                  value={emailData.subject} 
                  onChangeText={t => setEmailData({...emailData, subject: t})} 
                  placeholderTextColor="#555"
                />
              </View>

              <View>
                <Text style={styles.label}>VOTRE RÉPONSE</Text>
                <TextInput 
                  style={[styles.input, {height: 160, textAlignVertical: 'top'}]} 
                  multiline 
                  value={emailData.message} 
                  onChangeText={t => setEmailData({...emailData, message: t})} 
                  placeholderTextColor="#555"
                />
              </View>

              <TouchableOpacity 
                style={[styles.modalApplyBtn, (!emailData.message) && {opacity: 0.5}]} 
                onPress={handleSendEmail} 
                disabled={sendingEmail || !emailData.message}
              >
                {sendingEmail ? <ActivityIndicator color="#0B0E14" /> : <Text style={styles.modalApplyBtnText}>ENVOYER LA RÉPONSE</Text>}
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
  
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B', backgroundColor: '#1C2128' },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  btnBack: { padding: 8, marginRight: 12 },
  headerTitleBox: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'black', letterSpacing: 1 },
  headerSubtitle: { color: '#F5A623', fontSize: 12, fontWeight: 'bold' },
  btnRefresh: { padding: 8, backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: 8 },

  searchContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#2D333B', backgroundColor: '#1C2128' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, height: 44 },
  searchInput: { flex: 1, color: '#fff', paddingHorizontal: 12, fontSize: 14 },

  listContent: { padding: 16, paddingBottom: 60 },
  centerContainer: { py: 40, alignItems: 'center' },
  emptyCard: { backgroundColor: '#1C2128', padding: 40, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2D333B' },
  emptyText: { color: '#A0A0A0', fontSize: 14 },

  msgCard: { backgroundColor: '#1C2128', borderWidth: 1, borderColor: '#2D333B', borderRadius: 16, padding: 16, marginBottom: 12 },
  msgCardUnread: { borderColor: 'rgba(6, 182, 212, 0.3)', backgroundColor: 'rgba(6, 182, 212, 0.02)' },
  
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#06b6d4', marginTop: 6 },
  msgContact: { color: '#06b6d4', fontSize: 14, fontWeight: 'bold' },
  msgAuthor: { color: '#A0A0A0', fontSize: 11, marginTop: 2 },

  badgeReplied: { backgroundColor: 'rgba(0, 255, 148, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeRepliedText: { color: '#00FF94', fontSize: 9, fontWeight: 'black' },
  badgeUnread: { backgroundColor: 'rgba(245, 166, 35, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeUnreadText: { color: '#F5A623', fontSize: 9, fontWeight: 'black' },
  badgeRead: { backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeReadText: { color: '#A0A0A0', fontSize: 9, fontWeight: 'black' },

  msgBodyBox: { backgroundColor: '#0B0E14', padding: 12, borderRadius: 10, marginBottom: 16 },
  msgBodyText: { color: '#D1D5DB', fontSize: 13, lineHeight: 20 },

  msgFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  markReadText: { color: '#A0A0A0', fontSize: 12, textDecorationLine: 'underline' },
  btnReply: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#06b6d4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnReplyText: { color: '#0B0E14', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(11, 14, 20, 0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1C2128', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#2D333B', maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'black' },
  
  label: { color: '#A0A0A0', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, paddingHorizontal: 16, height: 48, color: '#fff', fontSize: 14 },
  fakeInput: { backgroundColor: '#0B0E14', borderWidth: 1, borderColor: '#2D333B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  fakeInputText: { color: '#555', fontSize: 14 },

  modalApplyBtn: { backgroundColor: '#06b6d4', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  modalApplyBtnText: { color: '#0B0E14', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});