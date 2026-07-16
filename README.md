# DevSecOps Podcast

## Transcript e artigo por episodio

Cada item de `data/episodes.json` aceita dois campos opcionais:

```json
{
  "transcriptUrl": "transcripts/slug-do-episodio.txt",
  "blogPostUrl": "posts/slug-do-episodio.html"
}
```

- Use `null`, uma string vazia ou remova o campo quando o episodio ainda nao tiver o recurso. O link nao sera exibido.
- Coloque transcripts em `transcripts/`. O formato pode ser `.txt`, `.md` ou outro arquivo que o navegador consiga baixar.
- Coloque cada artigo como uma pagina HTML estatica em `posts/`. Use `templates/blog-post.html` como ponto de partida.
- Prefira o mesmo slug do episodio nos nomes dos arquivos. Isso deixa as URLs previsiveis.

Depois de adicionar ou alterar conteudo, execute:

```bash
npm run verify
npm run sitemap
```

O primeiro comando impede links locais quebrados. O segundo inclui todos os episodios e artigos publicados no `sitemap.xml`.
