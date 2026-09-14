/**
 * Custom recursive filterOption function for Ant Design <Select> components.
 * Flexibly extracts text content from React elements, JSX arrays, labels, strings, or numbers
 * to ensure dropdown searching works reliably across all options.
 */
export const filterSelectOption = (input: string, option?: any): boolean => {
  if (!input || !option) return true;
  const searchInput = input.trim().toLowerCase();
  if (!searchInput) return true;

  const extractText = (node: any): string => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join(' ');
    if (typeof node === 'object') {
      if (node.props?.children) return extractText(node.props.children);
      if (node.label) return extractText(node.label);
      if (node.value !== undefined) return String(node.value);
    }
    return '';
  };

  const optionContent = (
    extractText(option.children) +
    ' ' +
    extractText(option.label) +
    ' ' +
    String(option.value ?? '')
  ).toLowerCase();

  return optionContent.includes(searchInput);
};
