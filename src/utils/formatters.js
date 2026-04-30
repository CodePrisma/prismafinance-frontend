export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const formatCurrency = (value) => currency.format(Number(value || 0));

export const formatDateInput = (date = new Date()) => {
  const parsed = date instanceof Date ? date : new Date(date);
  return parsed.toISOString().slice(0, 10);
};

export const formatDateDisplay = (date) => {
  if (!date) return "";

  const isoDate = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR").format(parsed);
};

export const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

export const formatCpf = (value) => {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
};

export const formatCnpj = (value) => {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
};

export const formatCpfCnpj = (value, tipo) => {
  if (Number(tipo) === 1) return formatCpf(value);
  if (Number(tipo) === 2) return formatCnpj(value);

  return onlyDigits(value).length > 11 ? formatCnpj(value) : formatCpf(value);
};

export const formatPhone = (value) => {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^(\(\d{2}\) \d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^(\(\d{2}\) \d{5})(\d)/, "$1-$2");
};

export const currentCompetencia = () => {
  const now = new Date();
  return {
    ano: now.getFullYear(),
    mes: now.getMonth() + 1,
  };
};

export const monthName = (mes) =>
  new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2026, Number(mes || 1) - 1, 1));

export const getId = (item, keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
  }
  return undefined;
};
