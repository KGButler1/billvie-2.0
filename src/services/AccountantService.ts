import { AccountantClient, AccountantProfile } from '@/types/sharing';

const PROFILE_KEY = 'billvie_accountant_profile';
const CLIENTS_KEY = 'billvie_accountant_clients';

const generateId = (): string => {
  return `acct_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateAccountantId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ACC-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export class AccountantService {
  // Get accountant profile
  static getProfile(): AccountantProfile | null {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  }

  // Create accountant profile
  static createProfile(displayName: string, email: string): AccountantProfile {
    const profile: AccountantProfile = {
      accountantId: generateAccountantId(),
      displayName,
      email,
      clients: [],
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  }

  // Get all clients
  static getClients(): AccountantClient[] {
    const profile = this.getProfile();
    return profile?.clients || [];
  }

  // Add a client (simulate receiving connection request)
  static addClient(name: string, email: string): AccountantClient {
    const client: AccountantClient = {
      id: generateId(),
      name,
      email,
      connectionStatus: 'pending',
      lastUpdated: new Date().toISOString(),
    };

    const profile = this.getProfile();
    if (profile) {
      profile.clients.push(client);
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }

    return client;
  }

  // Accept client connection
  static acceptClient(clientId: string): AccountantClient | undefined {
    const profile = this.getProfile();
    if (!profile) return undefined;

    const index = profile.clients.findIndex(c => c.id === clientId);
    if (index === -1) return undefined;

    profile.clients[index] = {
      ...profile.clients[index],
      connectionStatus: 'connected',
      connectedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile.clients[index];
  }

  // Disconnect client
  static disconnectClient(clientId: string): boolean {
    const profile = this.getProfile();
    if (!profile) return false;

    const index = profile.clients.findIndex(c => c.id === clientId);
    if (index === -1) return false;

    profile.clients[index].connectionStatus = 'disconnected';
    profile.clients[index].lastUpdated = new Date().toISOString();

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  }

  // Remove client
  static removeClient(clientId: string): boolean {
    const profile = this.getProfile();
    if (!profile) return false;

    profile.clients = profile.clients.filter(c => c.id !== clientId);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return true;
  }

  // Get connected clients only
  static getConnectedClients(): AccountantClient[] {
    return this.getClients().filter(c => c.connectionStatus === 'connected');
  }

  // Clear all
  static clearAll(): void {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(CLIENTS_KEY);
  }

  // Inject sample data for testing
  static injectSampleData(): void {
    const profile: AccountantProfile = {
      accountantId: 'ACC-TEST-1234',
      displayName: 'John Smith CPA',
      email: 'john.smith@accounting.com',
      clients: [
        {
          id: 'client_1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          connectionStatus: 'connected',
          lastUpdated: new Date().toISOString(),
          connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'client_2',
          name: 'Bob Williams',
          email: 'bob@example.com',
          connectionStatus: 'connected',
          lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          connectedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'client_3',
          name: 'Carol Davis',
          email: 'carol@example.com',
          connectionStatus: 'pending',
          lastUpdated: new Date().toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    };

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}
