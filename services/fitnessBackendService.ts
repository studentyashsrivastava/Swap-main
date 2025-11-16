// Fitness Backend Communication Service
import { config } from '../config/environment';
import NetInfo from '@react-native-community/netinfo';

// Type definitions for API responses
export interface PoseKeypoint {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  name: string;
}

export interface AnalysisResult {
  sessionId: string;
  exerciseType: string;
  totalReps: number;
  accuracy: number;
  formFeedback: FormFeedback[];
  keypoints: PoseKeypoint[];
  duration: number;
  calories: number;
  recommendations: string[];
  timestamp: string;
}

export interface PoseData {
  keypoints: PoseKeypoint[];
  confidence: number;
  formScore: number;
  currentRep: number;
  stage: 'up' | 'down' | 'hold' | 'rest';
  warnings: string[];
  timestamp: string;
}

export interface FormFeedback {
  timestamp: number;
  type: 'warning' | 'correction' | 'success';
  message: string;
  bodyPart: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ExerciseConfig {
  exerciseType: string;
  targetKeypoints: string[];
  thresholds: {
    minConfidence: number;
    formAccuracy: number;
    repCountThreshold: number;
  };
  parameters: {
    frameRate: number;
    analysisInterval: number;
    sessionTimeout: number;
  };
  feedback: {
    realTimeEnabled: boolean;
    audioEnabled: boolean;
    visualEnabled: boolean;
  };
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface QueuedRequest {
  id: string;
  type: 'video' | 'frame' | 'config' | 'summary';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface NetworkStatus {
  isConnected: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
  timestamp: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Base API client class
class FitnessBackendService {
  private static instance: FitnessBackendService;
  private baseUrl: string | null = null;
  private authToken: string | null = null;
  private isInitialized: boolean = false;
  private requestQueue: QueuedRequest[] = [];
  private isProcessingQueue: boolean = false;
  private networkStatus: NetworkStatus = {
    isConnected: true,
    type: null,
    isInternetReachable: null,
  };

  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  private configCache: Map<string, CacheEntry<ExerciseConfig>> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    console.log('🏋️ Fitness Backend Service initialized');
    this.initializeNetworkMonitoring();
  }

  static getInstance(): FitnessBackendService {
    if (!FitnessBackendService.instance) {
      FitnessBackendService.instance = new FitnessBackendService();
    }
    return FitnessBackendService.instance;
  }

  // ✅ Initialize with fixed backend URL (no multi-IP scanning)
  async initialize(): Promise<boolean> {
    if (this.isInitialized && this.baseUrl) {
      return true;
    }

    console.log('🔍 Initializing Fitness Backend Service...');

    try {
      this.baseUrl = config.API_BASE_URL;
      this.isInitialized = true;

      console.log(`✅ Fitness Backend Service initialized with fixed URL: ${this.baseUrl}`);
      console.log('🌐 No multi-IP scanning — using environment config only');
      return true;
    } catch (error) {
      console.error('❌ Error initializing Fitness Backend Service:', error);
      return false;
    }
  }

  // Set authentication token
  setAuthToken(token: string): void {
    this.authToken = token;
    console.log('🔐 Auth token set for Fitness Backend Service');
  }

  // Get base headers for requests
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  // Get multipart headers for file uploads
  private getMultipartHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  // Check backend health
  async checkBackendHealth(): Promise<boolean> {
    if (!this.baseUrl) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      console.log(`🔍 Health check: Testing ${this.baseUrl}/health`);
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return false;
    }
  }

  // Example simplified request (you can keep your upload/analyze logic same)
  async getExerciseConfig(exerciseType: string): Promise<any> {
    if (!this.baseUrl) {
      throw new Error('Backend service not initialized');
    }

    try {
      const url = `${this.baseUrl}/api/exercise-config/${exerciseType}`;
      console.log('📋 Requesting exercise config from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to get config: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Exercise config received:', data);
      return data;
    } catch (error) {
      console.error('❌ Error getting exercise config:', error);
      throw error;
    }
  }

  // Network monitoring
  private initializeNetworkMonitoring(): void {
    NetInfo.addEventListener((state) => {
      const wasConnected = this.networkStatus.isConnected;
      this.networkStatus = {
        isConnected: state.isConnected ?? false,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      };
      console.log('📶 Network status changed:', this.networkStatus);

      if (!wasConnected && this.networkStatus.isConnected && this.requestQueue.length > 0) {
        console.log('🔄 Network restored, processing queued requests');
        this.processRequestQueue();
      }
    });
  }

  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;

    this.isProcessingQueue = true;
    console.log(`🔄 Processing ${this.requestQueue.length} queued requests`);

    const requestsToProcess = [...this.requestQueue];
    this.requestQueue = [];

    for (const request of requestsToProcess) {
      try {
        await this.processQueuedRequest(request);
        console.log(`✅ Processed queued request: ${request.id}`);
      } catch (error) {
        console.error(`❌ Failed to process queued request ${request.id}:`, error);
        if (request.retryCount < this.retryConfig.maxRetries) {
          request.retryCount++;
          this.requestQueue.push(request);
        }
      }
    }

    this.isProcessingQueue = false;
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processRequestQueue(), 5000);
    }
  }

  private async processQueuedRequest(request: QueuedRequest): Promise<void> {
    switch (request.type) {
      case 'config':
        await this.getExerciseConfig(request.data.exerciseType);
        break;
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }
}

export const fitnessBackendService = FitnessBackendService.getInstance();
