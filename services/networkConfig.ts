// Network Configuration Helper for React Native
import { Platform } from 'react-native';
import { config } from '../config/environment';  // ✅ import must be here, at the top

export class NetworkConfig {
  private static instance: NetworkConfig;
  private detectedIP: string | null = null;

  private constructor() {}

  static getInstance(): NetworkConfig {
    if (!NetworkConfig.instance) {
      NetworkConfig.instance = new NetworkConfig();
    }
    return NetworkConfig.instance;
  }

  // ✅ Always use your environment.ts value
  getPossibleBackendUrls(): string[] {
    return [config.API_BASE_URL];
  }

  // Test a specific URL
  async testUrl(url: string): Promise<{ success: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Testing URL: ${url}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${url}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { success: true, responseTime };
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { success: false, error: 'Timeout (>3s)' };
      } else if (error.message?.includes('Network request failed')) {
        return { success: false, error: 'Network unreachable' };
      } else {
        return { success: false, error: error.message || 'Unknown error' };
      }
    }
  }

  // Find the best working backend URL
  async findBestBackendUrl(): Promise<{ url: string | null; results: any[] }> {
    const urls = this.getPossibleBackendUrls();
    const results: any[] = [];

    console.log(`🔍 Testing ${urls.length} possible backend URLs...`);

    for (const url of urls) {
      console.log(`Testing ${url}...`);
      const result = await this.testUrl(url);
      results.push({ url, ...result });

      if (result.success) {
        console.log(`✅ Found working backend at ${url} (${result.responseTime}ms)`);
        this.detectedIP = url;
        return { url, results };
      } else {
        console.log(`❌ ${url}: ${result.error}`);
      }
    }

    console.log('❌ No working backend found on any URL');
    console.log('ℹ️  App will continue with offline functionality only');
    return { url: null, results };
  }

  // Platform/network info for debugging
  getNetworkInfo(): any {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      possibleUrls: this.getPossibleBackendUrls(),
      detectedIP: this.detectedIP,
      recommendations: this.getRecommendations(),
    };
  }

  private getRecommendations(): string[] {
    const recommendations = [];

    if (Platform.OS === 'android') {
      recommendations.push('For Android Emulator: Use 10.0.2.2:8000 to access host machine');
      recommendations.push('For Android Device: Use your computer’s IP address (e.g., 192.168.1.100:8000)');
      recommendations.push('Ensure both devices are on the same Wi-Fi network');
      recommendations.push('Try: adb reverse tcp:8000 tcp:8000');
    } else if (Platform.OS === 'ios') {
      recommendations.push('For iOS Simulator: Use localhost:8000 or 127.0.0.1:8000');
      recommendations.push('For iOS Device: Use your computer’s IP address (e.g., 192.168.1.100:8000)');
      recommendations.push('Ensure both devices are on the same Wi-Fi network');
    }

    recommendations.push('Ensure Python backend is running: cd backend && python main.py');
    recommendations.push('Check firewall settings on your computer');
    recommendations.push('Verify backend is accessible in browser: http://127.0.0.1:8000');

    return recommendations;
  }

  getComputerIPInstructions(): string[] {
    return [
      'To find your computer’s IP address:',
      '',
      'Windows:',
      '1. Open Command Prompt',
      '2. Type: ipconfig',
      '3. Look for "IPv4 Address" under your Wi-Fi adapter',
      '',
      'macOS/Linux:',
      '1. Open Terminal',
      '2. Type: ifconfig | grep inet',
      '3. Look for your local network IP (usually 192.168.x.x)',
      '',
      'Then update the backend URL in environment.ts:',
      'http://YOUR_IP_ADDRESS:8000',
    ];
  }
}

export const networkConfig = NetworkConfig.getInstance();
