export interface Fornecedor {
  CodF: number;
  RazaoSocial: string;
  UF?: string;
  Cidade?: string;
  Logradouro?: string;
  Numero?: number;
  CNPJ: string;
  Telefone0: string;
  Telefone1?: string;
  Contato?: string;
  Complemento?: string;
  IC?: string;
  Observacoes?: string;
  Esconder?: number;
  Data: string;
}

export interface Produto {
  CodP: number;
  Nome: string;
  Codigo?: string;
  CodF?: number;
  PrecoCompra: number;
  PrecoVenda: number;
  ICMS: number;
  Margem: number;
  PrecoAntigo: number;
  DataPreco: string;
  Observacoes?: string;
  fornecedor?: Fornecedor;
  Esconder?: number;
  Data: string;
}

export interface Cliente {
  CodC: number;
  Nome: string;
  Documento: string;
  Logradouro?: string;
  Numero?: string;
  Bairro?: string;
  Telefone?: string;
  Complemento?: string;
  Observacoes?: string;
  Esconder?: number;
  Data: string;
}

export interface ItemVenda {
  CodP: number;
  Nome?: string;
  Quantidade: number;
  ValorP: string | number;
}

export interface Venda {
  CodV: number;
  Valor: number;
  CodC?: number;
  cliente?: Cliente;
  Endereco?: string;
  Entrega: number;
  Concluido: number;
  Data: string;
  itens: ItemVenda[];
}

export interface DashboardStats {
  total_produtos: number;
  total_fornecedores: number;
  total_clientes: number;
  total_vendas: number;
  faturamento_total: number;
}

export interface ContoraResponse {
  sucesso: boolean;
  protocolo?: string;
  chave_acesso?: string;
  mensagem: string;
  status_sefaz?: string;
  pdf_url?: string;
  xml_url?: string;
}
