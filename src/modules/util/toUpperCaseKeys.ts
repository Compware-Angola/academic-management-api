export const toUpperCaseKeys = (data: any): any => {
  if (data == null) return data;

  if (Array.isArray(data)) {
    return data.map(toUpperCaseKeys);
  }

  if (data instanceof Date) {
    return data;
  }

  if (typeof data === 'object') {
    return Object.keys(data).reduce((acc, key) => {
      const value = data[key];
      acc[key.toUpperCase()] = typeof value === 'object' && value !== null
        ? toUpperCaseKeys(value)
        : value;
      return acc;
    }, {} as any);
  }

  return data;
};