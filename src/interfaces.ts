// export interface DecodedToken {
//   iss: number;
//   exp: number;
//   nbf: number;
//   [key: string]: any;
// }

export interface RowWithTokens {
  accessToken?: string;
  refreshToken?: string;
  [key: string]: any;
}


// export interface ResponseLocalsWithTokens {
//   id?: number;
//   accessToken?: string;
//   refreshToken?: string;
//   [key: string]: any;
// }
