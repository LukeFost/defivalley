export interface DeviceCapabilities {
  hasTouch: boolean;
  hasMouse: boolean;
  hasKeyboard: boolean;
  pixelDensity: number;
  screenSize: 'small' | 'medium' | 'large' | 'xlarge';
  orientation: 'portrait' | 'landscape';
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  gpu: 'low' | 'medium' | 'high';
}

export class DeviceDetector {
  private static instance: DeviceDetector;
  private capabilities: DeviceCapabilities;
  private eventListeners: { [key: string]: ((data: any) => void)[] } = {};
  
  private constructor() {
    this.capabilities = this.detectCapabilities();
    this.setupListeners();
  }
  
  static getInstance(): DeviceDetector {
    if (!DeviceDetector.instance) {
      DeviceDetector.instance = new DeviceDetector();
    }
    return DeviceDetector.instance;
  }
  
  private detectCapabilities(): DeviceCapabilities {
    const hasTouch = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 ||
                     (navigator as any).msMaxTouchPoints > 0;
    
    const hasMouse = matchMedia('(hover: hover)').matches;
    const hasKeyboard = !hasTouch || (hasTouch && hasMouse);
    
    const pixelDensity = window.devicePixelRatio || 1;
    
    const screenSize = this.categorizeScreenSize();
    const orientation = this.getOrientation();
    const platform = this.detectPlatform();
    const gpu = this.estimateGPUTier();
    
    return {
      hasTouch,
      hasMouse,
      hasKeyboard,
      pixelDensity,
      screenSize,
      orientation,
      platform,
      gpu
    };
  }
  
  private categorizeScreenSize(): 'small' | 'medium' | 'large' | 'xlarge' {
    const width = Math.min(window.innerWidth, window.innerHeight);
    
    if (width < 375) return 'small';        // Small phones
    if (width < 768) return 'medium';       // Large phones
    if (width < 1024) return 'large';       // Tablets
    return 'xlarge';                         // Large tablets/desktop
  }
  
  private getOrientation(): 'portrait' | 'landscape' {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }
  
  private detectPlatform(): 'ios' | 'android' | 'desktop' | 'unknown' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    if (!this.capabilities?.hasTouch) return 'desktop';
    return 'unknown';
  }
  
  private estimateGPUTier(): 'low' | 'medium' | 'high' {
    // Simplified GPU tier detection
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'low';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // Add GPU benchmarking logic here
      // For now, use simple heuristics
      if (renderer.includes('Apple')) return 'high';
      if (renderer.includes('Adreno') && parseInt(renderer.match(/\d+/)?.[0] || '0') >= 600) return 'high';
    }
    
    // Default based on device age and type
    if (this.capabilities?.platform === 'ios') {
      return window.screen.width >= 375 ? 'medium' : 'low';
    }
    
    return 'medium';
  }
  
  private setupListeners(): void {
    window.addEventListener('orientationchange', () => {
      this.capabilities.orientation = this.getOrientation();
      this.emit('orientationchange', this.capabilities.orientation);
    });
    
    window.addEventListener('resize', this.debounce(() => {
      this.capabilities.screenSize = this.categorizeScreenSize();
      this.emit('resize', this.capabilities);
    }, 300));
  }
  
  private debounce(func: Function, wait: number): (...args: any[]) => void {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  getCapabilities(): DeviceCapabilities {
    return { ...this.capabilities };
  }
  
  isMobile(): boolean {
    return this.capabilities.hasTouch && !this.capabilities.hasMouse;
  }
  
  isTablet(): boolean {
    return this.capabilities.hasTouch && 
           (this.capabilities.screenSize === 'large' || 
            this.capabilities.screenSize === 'xlarge');
  }
  
  needsTouchControls(): boolean {
    return this.capabilities.hasTouch && !this.capabilities.hasKeyboard;
  }
  
  // Simple event emitter pattern
  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }
  
  off(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
  }
  
  private emit(event: string, data: any): void {
    if (!this.eventListeners[event]) return;
    this.eventListeners[event].forEach(callback => callback(data));
  }
}