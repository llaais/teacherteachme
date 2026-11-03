# Teacher Teach Me

Site estático para pré-visualização. Abra `index.html` em um navegador.

## O que funciona nesta versão
- Navegação por menu lateral (hambúrguer).
- Seções de apresentação, funcionamento e planos.
- Seleção de plano e formulários de cadastro/login.
- Painel de estudante com plano, chave Pix e materiais publicados.
- Painel de professora com cadastro local de estudantes, publicação de materiais e exclusão de conteúdos.
- Atalho para WhatsApp.

## Limitações importantes
Esta é uma demonstração front-end. Cadastro, senha, sessão, estudantes e materiais ficam no `localStorage` do navegador e não são compartilhados entre dispositivos ou usuários. Não há confirmação real por e-mail, recuperação segura de senha, banco de dados ou autenticação protegida. O painel de professora não deve ser publicado como sistema real antes de implementar controle de acesso no servidor.

Para colocar no ar com funcionamento real, é necessário integrar um backend (por exemplo, Supabase ou Firebase), configurar confirmação de e-mail, autenticação, banco de dados, armazenamento de arquivos e regras que permitam somente à professora administrar conteúdos. O envio de e-mails também depende de domínio/provedor e configuração de autenticação.
