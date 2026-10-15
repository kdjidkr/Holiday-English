export function splitExample(value:string):{english:string;korean?:string} {
  const text=value.trim();
  const dash=text.match(/^(.+?)\s+[—–]\s+(.+)$/s);
  if(dash && /[가-힣]/.test(dash[2]))return {english:dash[1].trim(),korean:dash[2].trim()};
  const parentheses=text.match(/^(.+?)\s*[（(]([^()（）]*[가-힣][^()（）]*)[）)]\s*$/s);
  if(parentheses)return {english:parentheses[1].trim(),korean:parentheses[2].trim()};
  return {english:text};
}
