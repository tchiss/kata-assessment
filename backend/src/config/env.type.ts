export interface AppConfigType {
  port: number;
}

export interface DBConfigType {
  uri: string;
}

export interface Auth0ConfigType {
  domain: string;
  clientId: string;
  clientSecret: string;
  audience: string;
}
