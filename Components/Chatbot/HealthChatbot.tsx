import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { HuggingFaceService } from '../../services/huggingFaceService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isTyping?: boolean;
}

interface HealthChatbotProps {
  userData: any;
  medicalProfile: any;
}

const HealthChatbot: React.FC<HealthChatbotProps> = ({ userData, medicalProfile }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const huggingFaceService = useRef(new HuggingFaceService()).current;
  const processingRef = useRef(false);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      text: `👋 Hello ${userData.firstName}! I’m your AI health assistant. I can help with:

💬 Health questions  
🏃 Exercise recommendations  
💊 Medication info  
🤒 Symptom analysis  
🥗 Wellness tips  

How can I assist you today?`,
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, [userData.firstName]);

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const addMessage = (text: string, isUser: boolean, isTyping = false) => {
    const newMessage: Message = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      text,
      isUser,
      timestamp: new Date(),
      isTyping,
    };
    setMessages(prev => [...prev, newMessage]);
    setTimeout(scrollToBottom, 80);
    return newMessage.id;
  };

  const updateMessage = (id: string, text: string) => {
    setMessages(prev => prev.map(msg => (msg.id === id ? { ...msg, text, isTyping: false } : msg)));
    setTimeout(scrollToBottom, 100);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || processingRef.current) return;
    const userMessage = inputText.trim();
    setInputText('');
    processingRef.current = true;

    addMessage(userMessage, true);
    const typingId = addMessage('AI is thinking...', false, true);
    setIsTyping(true);
    setIsLoading(true);

    try {
      const context = `
Patient Information:
- Name: ${userData.firstName} ${userData.lastName}
- Medical Profile: ${JSON.stringify(medicalProfile)}
- User Type: ${userData.userType}
      `;
      const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
      const servicePromise = huggingFaceService.generateHealthResponse(userMessage, context);
      const response = await Promise.race([servicePromise, timeoutPromise]);
      updateMessage(typingId, response);
    } catch {
      updateMessage(
        typingId,
        "⚠️ I'm having trouble connecting right now. Please try again shortly or consult a doctor for urgent concerns."
      );
    } finally {
      setIsTyping(false);
      setIsLoading(false);
      processingRef.current = false;
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderTypingIndicator = () => (
    <View style={styles.typingDots}>
      {[0, 1, 2].map(i => (
        <Animated.View key={i} style={[styles.dot, { animationDelay: `${i * 300}ms` }]} />
      ))}
    </View>
  );

  const renderMessage = (m: Message) => (
    <View
      key={m.id}
      style={[
        styles.messageContainer,
        m.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
      ]}
    >
      {!m.isUser && (
        <View style={styles.aiAvatar}>
          <FontAwesome5 name="robot" size={16} color="#667eea" />
        </View>
      )}
      <View style={[styles.messageBubble, m.isUser ? styles.userMessage : styles.aiMessage]}>
        {m.isTyping ? (
          renderTypingIndicator()
        ) : (
          <>
            <Text style={[styles.messageText, m.isUser ? styles.userText : styles.aiText]}>
              {m.text}
            </Text>
            <Text style={[styles.messageTime, m.isUser ? styles.userTime : styles.aiTime]}>
              {formatTime(m.timestamp)}
            </Text>
          </>
        )}
      </View>
      {m.isUser && (
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>{userData.firstName.charAt(0).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <FontAwesome5 name="heartbeat" size={22} color="#fff" />
        <View>
          <Text style={styles.headerTitle}>AI Health Assistant</Text>
          <Text style={styles.headerSubtitle}>Your personalized medical helper</Text>
        </View>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: isLoading ? '#FFB300' : '#4CAF50' },
          ]}
        >
          <Text style={styles.statusText}>
            {isLoading ? 'Thinking...' : 'Online'}
          </Text>
        </View>
      </LinearGradient>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about your health..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <FontAwesome5 name="paper-plane" size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>
          ⚠️ This AI gives general info only. Always consult healthcare professionals.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0c10',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statusIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesContent: {
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  aiMessageContainer: { justifyContent: 'flex-start' },
  userMessageContainer: { justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  aiMessage: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopLeftRadius: 4,
  },
  userMessage: {
    backgroundColor: '#667eea',
    borderTopRightRadius: 4,
  },
  aiText: { color: '#fff' },
  userText: { color: '#fff' },
  messageTime: { fontSize: 10, marginTop: 4 },
  aiTime: { color: 'rgba(255,255,255,0.6)' },
  userTime: { color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(102,126,234,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  userAvatarText: { color: '#fff', fontWeight: '700' },
  typingDots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
    opacity: 0.6,
  },
  inputContainer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#667eea',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { backgroundColor: 'rgba(102,126,234,0.4)' },
  disclaimer: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 6,
  },
});

export default HealthChatbot;
