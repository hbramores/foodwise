export function validateSalesInput(raw: string, allowBlank = true): {quantity:number|null;error:string|null} {
  const value = raw.trim();
  if (!value) return {quantity:null,error:allowBlank ? null : "Enter a whole number, including zero. To remove a saved sale, use History."};
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return {quantity:null,error:"Enter a nonnegative whole number."};
  return {quantity:Number(value),error:null};
}
