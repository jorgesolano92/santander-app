import { EventEmitter } from 'events';
import { UA, Registerer, Inviter, Session, SessionState } from 'sip.js';
import { Platform } from 'react-native';

// Platform-specific WebRTC imports
let mediaDevices: any;
let RTCPeerConnection: any;

if (Platform.OS === 'web') {
  // Use browser WebRTC APIs for web
  mediaDevices = navigator.mediaDevices;
  RTCPeerConnection = window.RTCPeerConnection;
} else {
  // Use react-native-webrtc for native platforms
  const webrtc = require('react-native-webrtc');
  mediaDevices = webrtc.mediaDevices;
  RTCPeerConnection = webrtc.RTCPeerConnection;
}

export interface SipConfig {
  sipUri: string;
  sipUsername: string;
  sipPassword: string;
  sipDomain: string;
  enableTLS?: boolean;
}

export interface SipCallState {
  isActive: boolean;
  isConnected: boolean;
  isIncoming: boolean;
  remoteUri?: string;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
}

export type SipEventType = 
  | 'registered'
  | 'unregistered' 
  | 'registrationFailed'
  | 'callStarted'
  | 'callConnected'
  | 'callEnded'
  | 'callFailed'
  | 'incomingCall'
  | 'error';

class SipService extends EventEmitter {
  private ua: UA | null = null;
  private registerer: Registerer | null = null;
  private currentSession: Session | null = null;
  private callState: SipCallState = {
    isActive: false,
    isConnected: false,
    isIncoming: false,
    duration: 0,
    isMuted: false,
    isSpeakerOn: false,
  };
  private callTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    super();
  }

  /**
   * Initialize the SIP service with configuration
   */
  async initialize(config: SipConfig): Promise<boolean> {
    try {
      console.log('🔧 Initializing SIP service with config:', {
        sipUri: config.sipUri,
        sipUsername: config.sipUsername,
        sipDomain: config.sipDomain,
        enableTLS: config.enableTLS
      });

      // Clean up existing UA if any
      if (this.ua) {
        await this.cleanup();
      }

      // Create SIP URI
      const serverUri = `${config.enableTLS ? 'wss' : 'ws'}://${config.sipDomain}`;
      const userUri = `sip:${config.sipUsername}@${config.sipDomain}`;

      // Configure UA options
      const uaOptions = {
        uri: userUri,
        transportOptions: {
          server: serverUri,
        },
        authorizationUsername: config.sipUsername,
        authorizationPassword: config.sipPassword,
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        },
        delegate: {
          onInvite: (invitation: any) => {
            console.log('📞 Incoming call from:', invitation.remoteIdentity.uri.toString());
            this.handleIncomingCall(invitation);
          },
        },
      };

      // Create User Agent
      this.ua = new UA(uaOptions);

      // Set up registerer
      this.registerer = new Registerer(this.ua);

      // Set up event listeners
      this.setupEventListeners();

      // Start the UA
      await this.ua.start();

      // Register
      await this.register();

      this.isInitialized = true;
      console.log('✅ SIP service initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize SIP service:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Register with SIP server
   */
  private async register(): Promise<void> {
    if (!this.registerer) {
      throw new Error('Registerer not initialized');
    }

    try {
      console.log('📝 Registering with SIP server...');
      await this.registerer.register();
      console.log('✅ Successfully registered with SIP server');
      this.emit('registered');
    } catch (error) {
      console.error('❌ Registration failed:', error);
      this.emit('registrationFailed', error);
      throw error;
    }
  }

  /**
   * Start an outgoing call
   */
  async startCall(targetUri: string): Promise<boolean> {
    if (!this.ua || !this.isInitialized) {
      console.error('❌ SIP service not initialized');
      return false;
    }

    if (this.callState.isActive) {
      console.error('❌ Call already in progress');
      return false;
    }

    try {
      console.log('📞 Starting call to:', targetUri);

      // Request microphone permission and get media stream
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      // Create inviter
      const inviter = new Inviter(this.ua, targetUri, {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false,
          },
        },
      });

      this.currentSession = inviter;

      // Set up session event listeners
      this.setupSessionEventListeners(inviter);

      // Update call state
      this.callState = {
        ...this.callState,
        isActive: true,
        isConnected: false,
        isIncoming: false,
        remoteUri: targetUri,
        duration: 0,
      };

      // Send invite
      await inviter.invite();

      this.emit('callStarted', targetUri);
      this.startCallTimer();

      console.log('✅ Call initiated successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to start call:', error);
      this.emit('callFailed', error);
      this.resetCallState();
      return false;
    }
  }

  /**
   * End the current call
   */
  async endCall(): Promise<void> {
    if (!this.currentSession) {
      console.log('ℹ️ No active call to end');
      return;
    }

    try {
      console.log('📞 Ending call...');

      if (this.currentSession.state === SessionState.Established) {
        await this.currentSession.bye();
      } else if (this.currentSession.state === SessionState.Establishing) {
        await this.currentSession.cancel();
      }

      this.resetCallState();
      this.emit('callEnded');

      console.log('✅ Call ended successfully');

    } catch (error) {
      console.error('❌ Failed to end call:', error);
      this.resetCallState();
      this.emit('error', error);
    }
  }

  /**
   * Mute/unmute microphone
   */
  async muteMicrophone(mute: boolean = true): Promise<void> {
    if (!this.currentSession || !this.callState.isConnected) {
      console.log('ℹ️ No active call to mute/unmute');
      return;
    }

    try {
      // Get the session description handler
      const sessionDescriptionHandler = this.currentSession.sessionDescriptionHandler;
      
      if (sessionDescriptionHandler && sessionDescriptionHandler.peerConnection) {
        const senders = sessionDescriptionHandler.peerConnection.getSenders();
        
        senders.forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = !mute;
          }
        });

        this.callState.isMuted = mute;
        console.log(`🎤 Microphone ${mute ? 'muted' : 'unmuted'}`);
      }

    } catch (error) {
      console.error('❌ Failed to mute/unmute microphone:', error);
      this.emit('error', error);
    }
  }

  /**
   * Toggle speakerphone
   */
  async setSpeakerphone(enabled: boolean): Promise<void> {
    // Note: Speakerphone control is platform-specific and may require additional native modules
    // This is a placeholder implementation
    this.callState.isSpeakerOn = enabled;
    console.log(`🔊 Speakerphone ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current call state
   */
  getCallState(): SipCallState {
    return { ...this.callState };
  }

  /**
   * Check if service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up SIP service...');

    // End any active call
    if (this.currentSession) {
      await this.endCall();
    }

    // Stop call timer
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }

    // Unregister
    if (this.registerer) {
      try {
        await this.registerer.unregister();
        this.emit('unregistered');
      } catch (error) {
        console.error('❌ Failed to unregister:', error);
      }
    }

    // Stop UA
    if (this.ua) {
      await this.ua.stop();
      this.ua = null;
    }

    this.registerer = null;
    this.currentSession = null;
    this.isInitialized = false;
    this.resetCallState();

    console.log('✅ SIP service cleaned up');
  }

  /**
   * Set up UA and registerer event listeners
   */
  private setupEventListeners(): void {
    if (!this.ua || !this.registerer) return;

    // UA events
    this.ua.delegate = {
      onInvite: (invitation: any) => {
        console.log('📞 Incoming call from:', invitation.remoteIdentity.uri.toString());
        this.handleIncomingCall(invitation);
      },
    };

    // Registerer events
    this.registerer.stateChange.addListener((newState) => {
      console.log('📝 Registration state changed:', newState);
    });
  }

  /**
   * Set up session event listeners
   */
  private setupSessionEventListeners(session: Session): void {
    session.stateChange.addListener((newState) => {
      console.log('📞 Call state changed:', newState);

      switch (newState) {
        case SessionState.Established:
          this.callState.isConnected = true;
          this.emit('callConnected');
          break;
        case SessionState.Terminated:
          this.resetCallState();
          this.emit('callEnded');
          break;
      }
    });
  }

  /**
   * Handle incoming call
   */
  private handleIncomingCall(invitation: any): void {
    this.currentSession = invitation;
    this.callState = {
      ...this.callState,
      isActive: true,
      isConnected: false,
      isIncoming: true,
      remoteUri: invitation.remoteIdentity.uri.toString(),
      duration: 0,
    };

    this.emit('incomingCall', invitation);
  }

  /**
   * Start call duration timer
   */
  private startCallTimer(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
    }

    this.callTimer = setInterval(() => {
      if (this.callState.isConnected) {
        this.callState.duration += 1;
      }
    }, 1000);
  }

  /**
   * Reset call state to default
   */
  private resetCallState(): void {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }

    this.callState = {
      isActive: false,
      isConnected: false,
      isIncoming: false,
      duration: 0,
      isMuted: false,
      isSpeakerOn: false,
    };

    this.currentSession = null;
  }
}

// Create and export singleton instance
const sipService = new SipService();

export { SipService, sipService };