/// <reference types="@sveltejs/adapter-cloudflare" />

declare global {
  namespace App {
    interface Error {
      message: string;
    }
  }
}

export {};
