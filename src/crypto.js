export async function encrypt(text, key) {
  const enc = new TextEncoder().encode(text);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cryptoKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key),
    "AES-GCM", false, ["encrypt"]
  );
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, cryptoKey, enc
  );
  return { iv: Array.from(iv), data: Array.from(new Uint8Array(cipher)) };
}

export async function decrypt(payload, key) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(key),
    "AES-GCM", false, ["decrypt"]
  );
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
    cryptoKey,
    new Uint8Array(payload.data)
  );
  return new TextDecoder().decode(plain);
}
