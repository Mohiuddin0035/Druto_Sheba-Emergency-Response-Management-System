import mqtt from 'mqtt';

const CONFIG = {
  host: process.env.NEXT_PUBLIC_MQTT_HOST,
  port: parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || '8884'),
  username: process.env.NEXT_PUBLIC_MQTT_USER,
  password: process.env.NEXT_PUBLIC_MQTT_PASS,
  topic: process.env.NEXT_PUBLIC_MQTT_TOPIC || 'emergency/ambulance/location',
};

class MqttService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.callbacks = new Set();
  }

  connect(clientId = `ers-${Math.random().toString(16).substr(2, 8)}`) {
    if (this.client || !CONFIG.host) {
      if (!CONFIG.host) console.warn('MQTT Connection skipped: NEXT_PUBLIC_MQTT_HOST is missing.');
      return;
    }

    const url = `wss://${CONFIG.host}:${CONFIG.port}/mqtt`;
    const client = mqtt.connect(url, {
      username: CONFIG.username,
      password: CONFIG.password,
      clientId,
      clean: true,
    });

    this.client = client;

    client.on('connect', () => {
      console.log('📡 MQTT Connected to System Hive');
      this.isConnected = true;
      client.subscribe(CONFIG.topic);
    });

    client.on('message', (topic, message) => {
      if (topic === CONFIG.topic) {
        try {
          const data = JSON.parse(message.toString());
          this.callbacks.forEach(cb => cb(data));
        } catch (e) {
          console.error('MQTT Parse Error:', e);
        }
      }
    });

    client.on('error', (err) => {
      console.error('MQTT Error:', err);
      this.isConnected = false;
    });

    client.on('close', () => {
      this.isConnected = false;
    });
  }


  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  publish(data) {
    if (this.client && this.isConnected) {
      this.client.publish(CONFIG.topic, JSON.stringify({
        ...data,
        ts: Date.now()
      }), { retain: true });
    }
  }

  publishOffline(id) {
    if (this.client && this.isConnected) {
      this.client.publish(CONFIG.topic, JSON.stringify({
        id,
        status: 'offline',
        ts: Date.now()
      }), { retain: true });
    }
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }
}

const mqttService = new MqttService();
export default mqttService;
