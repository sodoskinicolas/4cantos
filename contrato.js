/* Aba Contrato do 4Cantos: gera o contrato de sublocação de quarto (Word/PDF).
   Gerado a partir de core.js + saida.js + ui4c.js. */
(function(){
'use strict';
/* ===== Núcleo: números por extenso, datas e o texto do contrato ===== */
const MESES_EXT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const UNI = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
const DEZ = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
const CEN = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];

function ate999(n){
  if(n===100) return 'cem';
  const c=Math.floor(n/100), r=n%100, p=[];
  if(c) p.push(CEN[c]);
  if(r){ if(r<20) p.push(UNI[r]); else { const d=Math.floor(r/10),u=r%10; p.push(u?DEZ[d]+' e '+UNI[u]:DEZ[d]); } }
  return p.join(' e ');
}
function inteiroExtenso(n){
  if(n===0) return 'zero';
  const m=Math.floor(n/1000), r=n%1000; let t='';
  if(m) t = m===1 ? 'mil' : ate999(m)+' mil';
  if(r){ t += t ? ((r<100||r%100===0)?' e ':' ') : ''; t += ate999(r); }
  return t;
}
function extenso(v){
  v=Math.round((+v||0)*100)/100;
  const i=Math.floor(v), c=Math.round((v-i)*100), p=[];
  if(i) p.push(inteiroExtenso(i)+(i===1?' real':' reais'));
  if(c) p.push(inteiroExtenso(c)+(c===1?' centavo':' centavos'));
  return p.join(' e ')||'zero reais';
}
function dinheiro(v){ return 'R$'+(+v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function valorComExtenso(v){ return dinheiro(v)+' ('+extenso(v)+')'; }
/* caução: à vista (n=1) ou 2x. Sem valor da 1ª digitado, divide ao meio; a 2ª é sempre o resto (soma bate com o total). */
function caucaoPartes(s){
  const c=Math.round((+s.caucao||0)*100)/100, n=String(s.caucaoParcelas)==='2'?2:1;
  if(n===1) return {n,c,c1:c,c2:0};
  const dig=s.caucao1!==undefined&&s.caucao1!==null&&String(s.caucao1).trim()!=='';
  const c1=dig?Math.round((+s.caucao1||0)*100)/100:Math.round(c/2*100)/100;
  return {n,c,c1,c2:Math.round((c-c1)*100)/100};
}
function pad2(n){ return String(n).padStart(2,'0'); }
function parseISO(s){ if(!s) return null; const [y,m,d]=s.split('-').map(Number); return (y&&m&&d)?{y,m,d}:null; }
function toISO(o){ return o.y+'-'+pad2(o.m)+'-'+pad2(o.d); }
function hojeISO(){ const d=new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
function dataExtenso(s){ const o=parseISO(s); return o? pad2(o.d)+' de '+MESES_EXT[o.m-1]+' de '+o.y : ''; }
function addMeses(s,k){
  const o=parseISO(s); if(!o) return '';
  let m=o.m-1+k, y=o.y+Math.floor(m/12); m=((m%12)+12)%12;
  const ult=new Date(y,m+1,0).getDate();
  return toISO({y,m:m+1,d:Math.min(o.d,ult)});
}
function idade(nasc){ // nasc dd/mm/aaaa
  const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec((nasc||'').trim()); if(!m) return null;
  const h=new Date(); let a=h.getFullYear()-(+m[3]);
  if(h.getMonth()+1<+m[2] || (h.getMonth()+1===+m[2] && h.getDate()<+m[1])) a--;
  return a;
}
function cpfValido(c){
  c=(c||'').replace(/\D/g,''); if(c.length!==11||/^(\d)\1+$/.test(c)) return false;
  for(const t of [9,10]){ let s=0; for(let i=0;i<t;i++) s+=+c[i]*(t+1-i); if(((s*10)%11)%10!==+c[t]) return false; }
  return true;
}
function formataCPF(c){ const d=(c||'').replace(/\D/g,''); return d.length===11? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') : (c||'').trim(); }

const SUBLOCADOR = {
  nome:'NICOLAS SODOSKI', cpf:'105.815.909-70',
  texto:'NICOLAS SODOSKI, brasileiro, solteiro, maior, natural de Imbituva/PR nascido em 10/09/1998, empresário, residente e domiciliado em Ponta Grossa, Paraná, à Avenida Doutor Vicente Machado, 585, Centro, CEP 84.010-000 portador da cédula de Identidade RG 13.811.193-8 SSP/Pr e CPF 105.815.909-70,'
};

const FEM = {solteiro:'solteira',casado:'casada',divorciado:'divorciada','viúvo':'viúva',separado:'separada'};

/* Monta o contrato como lista de blocos. Cada bloco: {k, runs:[{t,b,f,miss}]}.
   f = campo preenchido (destacado na prévia); miss = campo que falta. */
function montarContrato(s){
  const B=[], T=t=>({t}), Bd=t=>({t,b:1}), F=(v,label)=> (v!==undefined&&v!==null&&String(v).trim()!=='')?{t:String(v).trim(),f:1}:{t:'['+label+']',miss:1};
  const P=(...r)=>B.push({k:'p',runs:r.flat()}), H=t=>B.push({k:'h',runs:[Bd(t)]}), L=t=>B.push({k:'li',runs:[T(t)]});
  const fem=s.sexo==='F';
  const civil = s.estadoCivil==='união estável' ? 'em união estável' : (fem ? (FEM[s.estadoCivil]||s.estadoCivil) : s.estadoCivil);

  B.push({k:'title',runs:[Bd(s.titulo||'CONTRATO DE SUBLOCAÇÃO DE QUARTO RESIDENCIAL')]});
  P(Bd('SUBLOCADOR: '),T(SUBLOCADOR.texto));

  // Sublocatário
  const segs=[[F(s.nome,'NOME COMPLETO')],[F(s.nacionalidade,'nacionalidade')],[T(civil||'solteiro')],[T('maior')]];
  if(s.profissao) segs.push([F(s.profissao)]);
  segs.push([T('natural de '),F(s.naturalidade,'cidade/UF de nascimento')]);
  segs.push([T((fem?'nascida':'nascido')+' em '),F(s.nascimento,'data de nascimento')]);
  const port=fem?'portadora':'portador', cpf=formataCPF(s.cpf);
  if(s.rg){ const d=[T(port+' da cédula de RG '),F(s.rg)]; if(s.rgEmissor) d.push(T(' Emissor: '),F(s.rgEmissor)); if(cpf) d.push(T(', CPF: '),F(cpf)); segs.push(d); }
  else if(cpf) segs.push([T(port+' do CPF '),F(cpf)]);
  else segs.push([T(port+' da cédula de RG '),F('','RG ou CPF')]);
  if(s.mae||s.pai){ const f=[T('filiação: ')]; if(s.mae) f.push(T('Mãe: '),F(s.mae)); if(s.pai) f.push(T(s.mae?' e Pai: ':'Pai: '),F(s.pai)); segs.push(f); }
  const sub=[Bd('SUBLOCATÁRIO: ')]; segs.forEach((g,i)=>{ if(i) sub.push(T(', ')); sub.push(...g); }); sub.push(T('.'));
  P(sub);

  H('OBJETO DA SUBLOCAÇÃO');
  P(T('O sublocador cede ao sublocatário o uso do quarto '),F(s.quarto,'nº do quarto'),T(' no imóvel localizado em '),F(s.imovelTexto,'endereço e apto'),T(', com direito ao uso das áreas comuns como cozinha, sala, lavanderia e banheiros.'));
  P(T('O quarto locado destina-se exclusivamente para uso residencial do SUBLOCATÁRIO.'));
  P(T('O SUBLOCATÁRIO deverá zelar pela boa conservação do imóvel, sendo responsável por qualquer dano ou multa de condomínio causado durante o período de locação.'));

  H('VALOR DO ALUGUEL E PAGAMENTO');
  const v=+s.aluguel||0, v1=(s.primeiroValor===''||s.primeiroValor==null)?v:(+s.primeiroValor||0), prop = v1 && v && v1!==v;
  P(T('Fica acordado entre as partes que o sublocatário pagará ao sublocador, no dia '),F(dataExtenso(s.pag1Data),'data do 1º pagamento'),
    T(', o valor do aluguel '+(prop?'proporcional ':'mensal ')+'referente a '),F(s.mesRef,'mês'),T(' no valor de '),F(v1?valorComExtenso(v1):'','valor'),
    T('. Vencendo na sequência, todo dia '),F(s.vencimento?pad2(s.vencimento):'','dia'),T(' de cada mês, o aluguel no valor de '),F(v?valorComExtenso(v):'','valor do aluguel'),
    T('.'+(s.incluso?' Já incluso nesse valor água, luz, internet, condomínio e mobília.':'')));
  if(s.formaTexto) P(T('Os pagamentos serão realizados '),F(s.formaTexto),T('.'));
  P(T('Após o vencimento incidirá multa de 10%, juros de 1% ao mês e correção monetária.'));

  H('CAUÇÃO');
  const c=+s.caucao||0, cp=caucaoPartes(s);
  /* caução à vista ou em até 2 parcelas, cada uma com o seu valor e a sua data */
  const quando = cp.n===2
    ? [T(', dividido em 2 (duas) parcelas: a primeira de '),F(cp.c1?valorComExtenso(cp.c1):'','valor da 1ª parcela'),T(', no dia '),F(dataExtenso(s.caucaoData),'data da 1ª parcela'),
       T(', e a segunda de '),F(cp.c2>0?valorComExtenso(cp.c2):'','valor da 2ª parcela'),T(', no dia '),F(dataExtenso(s.caucao2Data),'data da 2ª parcela')]
    : [T(', no dia '),F(dataExtenso(s.caucaoData),'data da caução')];
  P(T('O sublocatário pagará um valor de '),F(c?valorComExtenso(c):'','valor da caução'),quando,
    T(', a título de caução que será devolvido ao SUBLOCATÁRIO quando sair, caso o sublocatário informe a saída com 30 dias de antecedência do pagamento do último aluguel, findo prazo do contrato e não tenha pendências de taxa de mudança, multas ou danos pendentes no apartamento.'));
  const vd=s.vencimento?String(+s.vencimento):'';
  P(T('Exemplo: Quando for sair, precisa informar no dia '),F(vd,'dia'),T(' (no pagamento do aluguel) que sairá até o próximo dia '),F(vd,'dia'),T('.'));

  H('USO DO IMÓVEL');
  P(T('O sublocatário se compromete a manter o quarto e as áreas comuns em bom estado de conservação e limpeza, respeitando o direito dos demais moradores.'));

  H('REGRAS DE CONVÍVIO');
  P(T('O sublocatário deve respeitar as seguintes regras de convívio:'));
  ['1. Não realizar reuniões ou festas no apartamento que excedam o nível de barulho aceitável para a vizinhança do condomínio.',
   '2. Não deixar louça suja acumulada por mais de 3 vezes consecutivas.',
   '3. Colaborar com a limpeza das áreas comuns do imóvel ou contratar faxineira em sua escala de limpeza caso não consiga limpar.',
   '4. Não agredir física ou verbalmente e não furtar objetos pessoais dos demais moradores.',
   '5. Não fumar ou usar drogas nas dependências do apartamento.',
   '6. Não oferecer risco a segurança dos demais moradores do apartamento.',
   '7. É vedado ceder, emprestar ou sublocar o quarto a terceiros.'].forEach(t=>B.push({k:'num',runs:[T(t)]}));
  P(T('O descumprimento dessas regras poderá resultar na rescisão imediata do contrato e na perda do direito ao reembolso da caução.'));

  H('INADIMPLÊNCIA');
  P(T('O não pagamento do aluguel ou de qualquer encargo da sublocação por prazo superior a 05 (cinco) dias após o vencimento constituirá motivo para rescisão automática deste contrato, independentemente de aviso judicial.'));
  P(T('Rescindido o contrato, o SUBLOCATÁRIO terá o prazo máximo de 05 (cinco) dias corridos para desocupar voluntariamente o quarto e devolver as chaves ao SUBLOCADOR.'));
  P(T('Permanecendo no imóvel após esse prazo, ficará caracterizada ocupação irregular, sujeitando-se o SUBLOCATÁRIO às medidas judiciais cabíveis, bem como ao pagamento de taxa de ocupação equivalente a 1/30 do aluguel vigente por dia de permanência.'));
  P(T('O atraso superior a 15 dias autoriza o SUBLOCADOR a restringir imediatamente o acesso do SUBLOCATÁRIO às áreas comuns de uso não essencial que dependam de autorização do SUBLOCADOR, sem prejuízo da cobrança dos valores devidos. Os valores inadimplidos constituem dívida líquida e certa, podendo ser cobrados judicialmente pelo SUBLOCADOR.'));

  H('OBJETOS ABANDONADOS');
  P(T('Bens deixados no imóvel por mais de 30 dias após a desocupação poderão ser descartados ou doados pelo SUBLOCADOR.'));

  H('COMUNICAÇÃO');
  P(T('As partes reconhecem como válidas notificações realizadas por WhatsApp, e-mail ou mensagem eletrônica.'));

  H('DURAÇÃO DO CONTRATO');
  const N=parseInt(s.meses)||12;
  P(T('O contrato terá duração de '),F(N+' meses'),T(', com início em '),F(dataExtenso(s.inicio),'início'),T(' e término em '),F(dataExtenso(s.termino),'término'),
    T(', podendo ser renovado automaticamente ou por acordo entre as partes pelo período de '),F(N+' meses'),
    T('. Findo prazo o(a)(s) SUBLOCATÁRIO(A)(S) restituirá(ão) ao(à)(s) SUBLOCADOR(A)(ES)(S) o imóvel objeto, inteiramente desocupado e nas mesmas condições e estado em que o recebeu(eram).'));

  H('VISITAS');
  P(T('É permitida visita ocasional, vedada a pernoite superior a 2 noites consecutivas ou 5 noites no mês sem autorização dos demais moradores e será responsável por qualquer ato ou prejuízo que o visitante causar tanto no apartamento quanto no condomínio.'));

  H('USO DOS APARELHOS E DANOS AO APARTAMENTO');
  P(T('O sublocatário é responsável pelo uso adequado dos eletrodomésticos, móveis e demais itens do imóvel. Caso cause qualquer dano a esses itens ou à estrutura do apartamento, deverá providenciar o reparo dentro de 5 dias corridos, sob pena de multa ou rescisão do contrato.'));
  P(T('Em caso de perda da chave, tag, controle ou senha, o SUBLOCATÁRIO arcará integralmente com os custos de substituição.'));

  H('DA MULTA');
  const a5 = s.clausulaCurso ? [T('; a5) '),F(s.textoCurso,'texto da exceção a5')] : [];
  P(T('O(A)(s) SUBLOCADOR(A)(ES)(S) e o(a)(s) SUBLOCATÁRIO(A)(S) obrigam-se mutuamente a respeitar o presente contrato, tal qual se acha redigido, incorrendo ao(s) contratante(s) que infringir(em) quaisquer de suas cláusulas, condições determinadas ou exigências, e obrigações de ordens legais, quando for o caso, na seguinte multa: a) devolução antecipada do imóvel - Lei 8.245/91, art. 4º: o(a)(s) SUBLOCATÁRIO(A)(S) pagará(ão) ao(à)(s) SUBLOCADOR(A)(ES)(S) a multa equivalente a 03 (três) aluguéis vigentes à época, que será reduzida proporcionalmente ao tempo de contrato já cumprido, na base de '),
    F('1/'+N),T(' para cada mês já transcorrido, cuja verba poderá inclusive ser cobrada em ação de execução. Constituem-se exceções para a não incidência de multa, desde que o(a)(s) SUBLOCATÁRIO(A)(S) comunique(m) a administradora por escrito 30 (trinta) dias antes da desocupação: a1) se a devolução do imóvel ocorrer após o '),
    F(N+'º mês'),T(' do início do prazo contratual; a2) se o contrato estiver prorrogado por prazo indeterminado; a3) a qualquer tempo do contrato se a devolução decorrer de transferência pelo seu empregador (comprovadamente efetuada), para prestar serviço em localidade diversa daquela do início do contrato ou devido a mudança por motivo de intercâmbio (comprovadamente efetuado); a4) Caso LOCADOR solicite o apartamento'),
    a5,
    T('. b) prática de infração de obrigação legal ou contratual - Lei 8.245/91, art. 9º, item II: o(a)(s) SUBLOCATÁRIO(A)(S) pagará(ão) ao(à)(s) SUBLOCADOR(A)(ES)(S) a multa de 10% (dez por cento) sobre o valor do contrato, tantas vezes quantas forem às violações, sem prejuízo da resolução contratual, e das demais cominações previstas neste instrumento; ressaltando-se que no presente a multa contratual será paga integralmente seja qual for o tempo decorrido deste contrato; c) falta de pagamento de aluguéis e demais encargos - Lei 8.245/91, art. 9º, item III c/c alínea b, item II, art. 62: em caso de mora do(a)(s) SUBLOCATÁRIO(A)(S) quanto ao pagamento do aluguel e encargos sublocatícios, qualquer que seja o atraso, incidirá a multa de 10% (dez por cento) sobre o total do débito, acrescida de correção monetária calculada pelos mesmos índices previstos na cláusula III deste contrato, contados dia a dia e juros moratórios de 1% ao mês, além de honorários advocatícios, de 10% (dez por cento) sobre o valor total do débito, se administrativa a cobrança e de 30% (trinta por cento), se judicial (artigos 389 e 395 do Código Civil). Além disso, a inadimplência poderá ser comunicada às entidades mantenedoras de bancos de dados de proteção ao crédito (Serasa, SPC, etc.). Parágrafo Único O(A)(s) SUBLOCATÁRIO(A)(S) expressamente autorizam o(a)(s) SUBLOCADOR(A)(ES)(S) a proceder(em) a(s) sua(s) citação(ões) inicial(is), interpelação(ões), intimação(ões), notificação(ões), ou qualquer outro ato de comunicação processual, por via postal, fax e/ou e-mail, em toda e qualquer ação judicial ou procedimento extrajudicial, decorrente da relação locatícia ora ajustada, especialmente às intimações referidas nos artigos 62, III, e 67, II e VII, da lei nº 8.245/91.'));

  P(Bd('RESCISÃO: '),T('Caso o sublocatário deseje sair do imóvel, deverá comunicar o sublocador com 30 dias de antecedência ao último aluguel. Caso o sublocatário saia antes do fim do contrato ou não avise com a antecedência de 30 dias ao último aluguel, perderá o direito a restituição do caução e multa conforme parágrafo anterior.'));
  P(T('Constituem motivos para rescisão imediata:'));
  ['atraso de aluguel superior a 30 dias;','agressão física ou ameaça;','furto ou dano intencional;','uso ou armazenamento de drogas ilícitas;','recebimento habitual de hóspedes sem autorização;','descumprimento reiterado das regras de convivência;','prática de atos que coloquem em risco a segurança dos moradores.'].forEach(L);

  H('DISPOSIÇÕES GERAIS');
  P(T('Fica eleito o foro da Comarca de Ponta Grossa, com renúncia a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer controvérsias oriundas deste contrato.'));
  P(T('Por estarem assim justos e contratados, as partes assinam o presente contrato em duas vias de igual teor e forma.'));
  B.push({k:'local',runs:[Bd('Ponta Grossa, '),{...F(dataExtenso(s.assinatura),'data'),b:1}]});
  B.push({k:'sig',runs:[T(SUBLOCADOR.nome)],sub:'CPF '+SUBLOCADOR.cpf,papel:'Sublocador'});
  B.push({k:'sig',runs:[F((s.nome||'').toUpperCase(),'NOME')],sub: cpf?('CPF '+cpf):(s.rg?('RG '+s.rg):''),papel:'Sublocatário'});
  return B;
}

function textoPlano(blocks){
  return blocks.map(b=>{
    const t=b.runs.map(r=>r.t).join('');
    if(b.k==='li') return '• '+t;
    if(b.k==='sig') return '\n\n__________________________________________\n'+t+(b.sub?'\n'+b.sub:'');
    return t;
  }).join('\n\n');
}

//{extenso,dinheiro,dataExtenso,addMeses,idade,cpfValido,formataCPF,montarContrato,textoPlano,MESES_EXT,hojeISO,pad2,parseISO};

/* ===== Saída: Word (.docx) e PDF a partir dos blocos ===== */
function gerarDocx(blocks, lib){
  const {Document,Packer,Paragraph,TextRun,AlignmentType} = lib;
  const run=(r)=>new TextRun({text:r.t,bold:!!r.b,font:'Arial',size:22});
  const kids=[];
  for(const b of blocks){
    if(b.k==='title') kids.push(new Paragraph({alignment:AlignmentType.CENTER,spacing:{after:360},children:[new TextRun({text:b.runs[0].t,bold:true,font:'Arial',size:24})]}));
    else if(b.k==='h') kids.push(new Paragraph({keepNext:true,spacing:{before:280,after:120},children:b.runs.map(run)}));
    else if(b.k==='li') kids.push(new Paragraph({alignment:AlignmentType.JUSTIFIED,indent:{left:720,hanging:360},spacing:{after:60},children:[new TextRun({text:'•\t',font:'Arial',size:22}),...b.runs.map(run)]}));
    else if(b.k==='num') kids.push(new Paragraph({alignment:AlignmentType.JUSTIFIED,spacing:{after:80},children:b.runs.map(run)}));
    else if(b.k==='local') kids.push(new Paragraph({spacing:{before:480,after:240},children:b.runs.map(r=>run({...r,b:1}))}));
    else if(b.k==='sig'){
      kids.push(new Paragraph({keepNext:true,keepLines:true,spacing:{before:720},children:[new TextRun({text:'__________________________________________',font:'Arial',size:22})]}));
      kids.push(new Paragraph({keepNext:true,children:b.runs.map(r=>run({...r,b:1}))}));
      kids.push(new Paragraph({children:[new TextRun({text:(b.sub||'')+(b.sub?'  ·  ':'')+b.papel,font:'Arial',size:20})]}));
    }
    else kids.push(new Paragraph({alignment:AlignmentType.JUSTIFIED,spacing:{after:160,line:276},children:b.runs.map(run)}));
  }
  const doc=new Document({creator:'Nicolas Sodoski',title:'Contrato de sublocação',
    styles:{default:{document:{run:{font:'Arial',size:22}}}},
    sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1440}}},children:kids}]});
  return Packer.toBlob ? Packer.toBlob(doc) : Packer.toBuffer(doc);
}

function gerarPdf(blocks, jsPDF){
  const doc=new jsPDF({unit:'pt',format:'a4'});
  const W=doc.internal.pageSize.getWidth(), Hh=doc.internal.pageSize.getHeight(), M=72, MAXW=W-2*M;
  let y=M;
  const limpa=t=>t.replace(/•/g,'-').replace(/[–—]/g,'-').replace(/́/g,'');
  function quebra(h){ if(y+h>Hh-M){ doc.addPage(); y=M; } }
  function paragrafo(runs,{size=11,lh=15.5,indent=0,after=8,align='justify',forceBold=false}={}){
    doc.setFontSize(size);
    const toks=[]; // {w,b}
    for(const r of runs){ limpa(r.t).split(/(\s+)/).forEach(p=>{ if(p==='') return; if(/^\s+$/.test(p)) toks.push({sp:1}); else toks.push({w:p,b:forceBold||!!r.b}); }); }
    // soma letra a letra: getTextWidth aplica kerning, mas doc.text não — mediria a menos
    const larg=t=>{ doc.setFont('helvetica',t.b?'bold':'normal'); let s=0; for(const ch of t.w) s+=doc.getTextWidth(ch); return s; };
    doc.setFont('helvetica','normal'); const esp=doc.getTextWidth(' ');
    // junta palavras coladas (sem espaço) num "grupo" para não quebrar no meio
    const grupos=[]; let g=null;
    for(const t of toks){ if(t.sp){ g=null; continue; } if(!g){ g={parts:[],w:0}; grupos.push(g); } t.wd=larg(t); g.parts.push(t); g.w+=t.wd; }
    const linhas=[]; let lin=[], lw=0, avail=MAXW-indent;
    for(const gr of grupos){ const add=(lin.length?esp:0)+gr.w; if(lin.length && lw+add>avail){ linhas.push({g:lin,w:lw}); lin=[gr]; lw=gr.w; } else { lin.push(gr); lw+=add; } }
    if(lin.length) linhas.push({g:lin,w:lw,ultima:1});
    linhas.forEach((l,i)=>{
      quebra(lh);
      let x=M+indent, gap=esp;
      if(align==='center') x=M+(MAXW-l.w)/2;
      else if(align==='justify' && !l.ultima && l.g.length>1) gap=esp+(avail-l.w)/(l.g.length-1);
      for(const gr of l.g){ for(const p of gr.parts){ doc.setFont('helvetica',p.b?'bold':'normal'); doc.text(p.w,x,y); x+=p.wd; } x+=gap; }
      y+=lh;
    });
    y+=after;
  }
  for(const b of blocks){
    if(b.k==='title'){ paragrafo(b.runs,{size:12,align:'center',after:16,forceBold:true}); }
    else if(b.k==='h'){ quebra(40); y+=8; paragrafo(b.runs,{after:4,align:'left'}); }
    else if(b.k==='li'){ doc.setFont('helvetica','normal'); doc.setFontSize(11); quebra(15.5); doc.text('-',M+18,y); paragrafo(b.runs,{indent:32,after:2}); }
    else if(b.k==='num'){ paragrafo(b.runs,{after:3}); }
    else if(b.k==='local'){ quebra(250); y+=18; paragrafo(b.runs,{forceBold:true,align:'left',after:10}); }
    else if(b.k==='sig'){ quebra(80); y+=40; doc.setFont('helvetica','normal'); doc.setFontSize(11); doc.text('__________________________________________',M,y); y+=15;
      paragrafo(b.runs,{forceBold:true,align:'left',after:0}); doc.setFontSize(9.5); doc.setFont('helvetica','normal'); doc.text(limpa((b.sub?b.sub+'  ·  ':'')+b.papel),M,y); y+=8; }
    else paragrafo(b.runs);
  }
  return doc.output('blob');
}
//{gerarDocx,gerarPdf};

/* ===== Aba Contrato do 4Cantos =====
   Usa do painel (escopo global): DATA, MESES (JAN..DEZ), save(), esc não (temos o nosso).
   Renderiza UMA vez: o render() do painel chama Contrato.render(el) a cada troca,
   e aqui só atualizamos a lista de apartamentos para não apagar o que foi digitado. */
const CSS=`
#v-contrato [hidden]{display:none!important}
#v-contrato{--ct-paper:#fbfbf8;--ct-ink:#141414;--ct-mark:#fff0b0;--ct-miss:#fbd9d4;--ct-miss-ink:#9b1c12}
#v-contrato .ct-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:10px}
#v-contrato .ct-h{display:flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.9px;text-transform:uppercase;color:var(--mut);font-weight:700;margin:0 0 12px}
#v-contrato .ct-h b{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--card2);color:var(--tx);font-size:11px;letter-spacing:0}
#v-contrato .ct-h small{margin-left:auto;text-transform:none;letter-spacing:0;font-weight:600}
#v-contrato .ct-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#v-contrato .ct-grid.c3{grid-template-columns:repeat(3,minmax(0,1fr))}
#v-contrato .ct-full{grid-column:1/-1}
@media (max-width:520px){#v-contrato .ct-grid.c3{grid-template-columns:repeat(2,minmax(0,1fr))}#v-contrato .ct-grid.c3>.ct-f:last-child{grid-column:1/-1}}
@media (max-width:380px){#v-contrato .ct-grid{grid-template-columns:minmax(0,1fr)}}
#v-contrato .ct-f{display:flex;flex-direction:column;gap:5px;min-width:0}
#v-contrato .ct-f>label,#v-contrato .ct-lbl{font-size:11px;color:var(--mut);font-weight:700;letter-spacing:.3px;display:flex;align-items:center;gap:6px}
#v-contrato input,#v-contrato select{width:100%;min-width:0;background:var(--card2);border:1px solid var(--line);color:var(--tx);font:600 16px/1.2 inherit;font-family:inherit;padding:10px;border-radius:9px;-webkit-appearance:none;appearance:none}
#v-contrato select{background-image:linear-gradient(45deg,transparent 50%,var(--mut) 50%),linear-gradient(135deg,var(--mut) 50%,transparent 50%);background-position:calc(100% - 15px) 52%,calc(100% - 10px) 52%;background-size:5px 5px;background-repeat:no-repeat;padding-right:26px}
#v-contrato input[type=date]{min-height:42px}
#v-contrato input:focus,#v-contrato select:focus{outline:0;border-color:var(--blu)}
#v-contrato input::placeholder{color:#4b5568}
#v-contrato input.ct-lido{border-color:rgba(52,211,153,.55);background:rgba(52,211,153,.08)}
#v-contrato .ct-num{font-variant-numeric:tabular-nums}
#v-contrato .ct-hint{font-size:11.5px;color:var(--mut);line-height:1.45;margin:0}
#v-contrato .ct-stack{display:flex;flex-direction:column;gap:12px}
#v-contrato .ct-chips{display:flex;flex-wrap:wrap;gap:6px}
#v-contrato .ct-chip{padding:8px 12px;border-radius:10px;background:var(--card2);border:1px solid var(--line);color:var(--mut);font:600 13px/1.2 inherit;font-family:inherit;text-align:left}
#v-contrato .ct-chip small{display:block;font-size:10.5px;font-weight:600;opacity:.8;margin-top:2px}
#v-contrato .ct-chip[aria-pressed=true]{background:var(--tx);color:#0d0f14;border-color:var(--tx)}
#v-contrato .ct-tag{font-size:9px;font-weight:800;padding:2px 7px;border-radius:999px;letter-spacing:.4px;background:rgba(52,211,153,.16);color:var(--grn)}
#v-contrato .ct-tag.ko{background:rgba(248,113,113,.14);color:var(--red)}
#v-contrato .ct-seg{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;width:max-content;max-width:100%}
#v-contrato .ct-seg button{border:0;background:var(--card2);color:var(--mut);font:600 14px inherit;font-family:inherit;padding:10px 14px}
#v-contrato .ct-seg button+button{border-left:1px solid var(--line)}
#v-contrato .ct-seg button[aria-pressed=true]{background:var(--tx);color:#0d0f14}
#v-contrato .ct-check{display:flex;gap:9px;align-items:flex-start;font-size:13.5px;color:var(--tx)}
#v-contrato .ct-check input{width:18px;height:18px;flex:0 0 auto;margin-top:1px;accent-color:var(--grn);-webkit-appearance:auto;appearance:auto;padding:0}
#v-contrato .ct-btn{padding:13px 16px;border-radius:12px;background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.4);color:var(--blu);font:700 14px inherit;font-family:inherit}
#v-contrato .ct-btn.pri{background:var(--blu);border-color:var(--blu);color:#0d0f14}
#v-contrato .ct-btn.gh{background:var(--card2);border-color:var(--line);color:var(--tx)}
#v-contrato .ct-btn:disabled{opacity:.4}
#v-contrato .ct-btn:active{transform:scale(.97)}
#v-contrato .ct-btns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#v-contrato .ct-link{border:0;background:none;color:var(--blu);font:700 12px inherit;font-family:inherit;padding:0;text-align:left}
#v-contrato .ct-drop{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;border:1.5px dashed var(--line);border-radius:12px;padding:18px 12px;text-align:center;background:var(--card2)}
#v-contrato .ct-drop b{font-size:14px;color:var(--blu)} #v-contrato .ct-drop span{font-size:11.5px;color:var(--mut)}
#v-contrato .ct-drop input{position:absolute;inset:0;opacity:0;width:100%;height:100%;padding:0}
#v-contrato .ct-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:8px}
#v-contrato .ct-thumb{position:relative;aspect-ratio:3/4;max-width:100%;border:1px solid var(--line);border-radius:9px;overflow:hidden;background:var(--card2);display:grid;place-items:center}
#v-contrato .ct-thumb img{width:100%;height:100%;object-fit:cover}
#v-contrato .ct-thumb span{font-size:10px;color:var(--mut);padding:4px;text-align:center;word-break:break-all}
#v-contrato .ct-thumb button{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;border:0;background:rgba(0,0,0,.7);color:#fff;font-size:14px;line-height:24px;padding:0}
#v-contrato .ct-status{font-size:12.5px;color:var(--mut);display:flex;gap:8px;align-items:center;min-height:18px}
#v-contrato .ct-spin{width:14px;height:14px;border:2px solid var(--card2);border-top-color:var(--blu);border-radius:50%;animation:ctg .8s linear infinite;flex:0 0 auto}
@keyframes ctg{to{transform:rotate(360deg)}}
#v-contrato .ct-alerts{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
#v-contrato .ct-alerts li{font-size:12.5px;line-height:1.4;padding:9px 11px;border-radius:10px;background:rgba(251,191,36,.12);color:var(--amb)}
#v-contrato .ct-alerts li.ko{background:rgba(248,113,113,.12);color:var(--red)}
#v-contrato .ct-alerts li.ok{background:rgba(52,211,153,.12);color:var(--grn)}
#v-contrato .ct-key{display:flex;gap:8px}
#v-contrato .ct-erro{color:var(--red)}
#v-contrato .ct-paperwrap{max-height:70vh;overflow:auto;border-radius:10px;-webkit-overflow-scrolling:touch}
#v-contrato .ct-paper{background:var(--ct-paper);color:var(--ct-ink);padding:22px 18px;font:12.5px/1.6 Arial,Helvetica,sans-serif;border-radius:10px}
#v-contrato .ct-paper p{margin:0 0 9px;text-align:justify;hyphens:auto}
#v-contrato .ct-paper .t{text-align:center;font-weight:700;font-size:13.5px;margin-bottom:16px}
#v-contrato .ct-paper .h{font-weight:700;margin:15px 0 5px}
#v-contrato .ct-paper .li{padding-left:20px;position:relative;margin-bottom:3px}
#v-contrato .ct-paper .li::before{content:"•";position:absolute;left:7px}
#v-contrato .ct-paper .lc{font-weight:700;margin-top:20px}
#v-contrato .ct-paper .sg{margin-top:30px;border-top:1px solid #222;width:min(300px,100%);padding-top:4px}
#v-contrato .ct-paper .sg b{display:block} #v-contrato .ct-paper .sg small{font-size:11px;color:#555}
#v-contrato .ct-paper mark{background:var(--ct-mark);color:inherit;border-radius:2px;padding:0 1px}
#v-contrato .ct-paper mark.miss{background:var(--ct-miss);color:var(--ct-miss-ink);font-weight:700}
#v-contrato .ct-reg{border-top:1px solid var(--line);padding-top:12px;margin-top:2px}
#v-contrato .ct-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);transform:translateX(-50%);z-index:70;background:var(--tx);color:#0d0f14;padding:10px 16px;border-radius:10px;font-size:13.5px;font-weight:600;max-width:calc(100% - 32px);box-shadow:0 8px 30px rgba(0,0,0,.4)}
`;

const ENDERECOS={'64':'Av. Doutor Vicente Machado, 585','92':'Av. Doutor Vicente Machado, 585','63':'Av. Doutor Vicente Machado, 522','142':'Av. Doutor Vicente Machado, 522'};
const AI_KEY='4cantos_ai';
const st={sexo:'M',ai:-1,qi:-1,vencimento:5,meses:12,vencOutro:false};
const tocado=new Set();
let montado=false, root=null, arquivos=[], ultimo=null, ctl=null;
const $=id=>document.getElementById('ct_'+id);
const escH=t=>String(t==null?'':t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- bibliotecas sob demanda ---------- */
const LIBS={jspdf:['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',()=>window.jspdf],
            docx:['https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',()=>window.docx]};
const carregando={};
function lib(n){ const [src,get]=LIBS[n]; if(get()) return Promise.resolve(get());
  return carregando[n]||(carregando[n]=new Promise((ok,erro)=>{ const s=document.createElement('script'); s.src=src; s.async=true;
    s.onload=()=>get()?ok(get()):erro(new Error('lib')); s.onerror=()=>{ delete carregando[n]; s.remove(); erro(new Error('lib')); }; document.head.append(s); })); }

/* ---------- dados do painel ---------- */
function aps(){ return (typeof DATA!=='undefined'&&Array.isArray(DATA))?DATA:[]; }
function apAtual(){ return aps()[st.ai]; }
function numQuarto(q){ const m=/(\d+)/.exec(q&&q.quarto||''); return m?String(+m[1]):''; }
function endereco(ap){ return ap? (ap.endereco||ENDERECOS[String(ap.id)]||'') : ''; }
function moda(lista){ const c={}; let best=0,v=0; lista.forEach(x=>{ if(x>0){ c[x]=(c[x]||0)+1; if(c[x]>best){best=c[x];v=x;} } }); return v; }
function valorTipico(q){ return q&&q.meses? moda(MESES.map(m=>q.meses[m]&&q.meses[m].v||0)) : 0; }

/* ---------- HTML da aba ---------- */
function html(){
  return `<style>${CSS}</style>
<h2 class="sec">Novo contrato de quarto</h2>
<div class="ct-card"><div class="ct-h"><b>1</b>Documentos do morador</div><div class="ct-stack">
  <label class="ct-drop" for="ct_arq"><b>Escolher fotos ou PDFs</b><span>RG, CNH, CPF, certidão. Pode tirar foto na hora.</span>
    <input type="file" id="ct_arq" multiple accept="image/*,application/pdf"></label>
  <div class="ct-thumbs" id="ct_thumbs"></div>
  <button type="button" class="ct-btn pri" id="ct_ler" disabled>Ler documentos e preencher</button>
  <button type="button" class="ct-btn gh" id="ct_parar" hidden>Parar leitura</button>
  <div class="ct-status" id="ct_status" aria-live="polite"></div>
  <ul class="ct-alerts" id="ct_avisos"></ul>
  <div id="ct_cfgbox" hidden class="ct-stack">
    <p class="ct-hint">Cole uma chave do Gemini (aistudio.google.com → Chaves de API, ícone de copiar) ou da Anthropic (console.anthropic.com, começa com "sk-ant"). Ela fica salva só neste aparelho e não vai para a nuvem do painel.</p>
    <div class="ct-key"><input id="ct_key" type="password" placeholder="cole a chave aqui" autocomplete="off" autocapitalize="off"><button type="button" class="ct-btn" id="ct_keysave">Salvar</button></div>
    <p class="ct-hint" id="ct_keymsg" hidden></p>
    <button type="button" class="ct-link" id="ct_keydel" hidden>Apagar a chave deste aparelho</button>
  </div>
  <button type="button" class="ct-link" id="ct_cfg">Configurar leitura automática</button>
</div></div>

<div class="ct-card"><div class="ct-h"><b>2</b>Dados do morador<small>confira antes de gerar</small></div><div class="ct-grid">
  <div class="ct-f ct-full"><label for="ct_nome">Nome completo</label><input id="ct_nome" data-k="nome" autocapitalize="characters"></div>
  <div class="ct-f"><span class="ct-lbl">Sexo</span><div class="ct-seg" id="ct_sexo"><button type="button" data-v="M" aria-pressed="true">Masc.</button><button type="button" data-v="F" aria-pressed="false">Fem.</button></div></div>
  <div class="ct-f"><label for="ct_estadoCivil">Estado civil</label><select id="ct_estadoCivil" data-k="estadoCivil"><option value="solteiro">Solteiro(a)</option><option value="casado">Casado(a)</option><option value="divorciado">Divorciado(a)</option><option value="viúvo">Viúvo(a)</option><option value="união estável">União estável</option></select></div>
  <div class="ct-f"><label for="ct_nacionalidade">Nacionalidade</label><input id="ct_nacionalidade" data-k="nacionalidade" value="brasileiro"></div>
  <div class="ct-f"><label for="ct_profissao">Profissão (opcional)</label><input id="ct_profissao" data-k="profissao"></div>
  <div class="ct-f"><label for="ct_naturalidade">Natural de (cidade/UF)</label><input id="ct_naturalidade" data-k="naturalidade" placeholder="IRATI/PR" autocapitalize="characters"></div>
  <div class="ct-f"><label for="ct_nascimento">Nascimento <span id="ct_tIdade"></span></label><input id="ct_nascimento" data-k="nascimento" class="ct-num" inputmode="numeric" placeholder="dd/mm/aaaa" maxlength="10"></div>
  <div class="ct-f"><label for="ct_rg">RG</label><input id="ct_rg" data-k="rg" class="ct-num"></div>
  <div class="ct-f"><label for="ct_rgEmissor">Órgão emissor</label><input id="ct_rgEmissor" data-k="rgEmissor" placeholder="SESP PR" autocapitalize="characters"></div>
  <div class="ct-f ct-full"><label for="ct_cpf">CPF <span id="ct_tCpf"></span></label><input id="ct_cpf" data-k="cpf" class="ct-num" inputmode="numeric" placeholder="000.000.000-00"></div>
  <div class="ct-f ct-full"><label for="ct_mae">Nome da mãe</label><input id="ct_mae" data-k="mae" autocapitalize="characters"></div>
  <div class="ct-f ct-full"><label for="ct_pai">Nome do pai (opcional)</label><input id="ct_pai" data-k="pai" autocapitalize="characters"></div>
</div></div>

<div class="ct-card"><div class="ct-h"><b>3</b>Onde vai morar</div><div class="ct-stack">
  <div class="ct-chips" id="ct_aps"></div>
  <div class="ct-f"><span class="ct-lbl">Quarto</span><div class="ct-chips" id="ct_quartos"></div></div>
  <div class="ct-f"><label for="ct_end">Endereço do prédio (rua e número)</label><input id="ct_end" placeholder="Av. Doutor Vicente Machado, 585"><p class="ct-hint" id="ct_endhint"></p></div>
</div></div>

<div class="ct-card"><div class="ct-h"><b>4</b>Valores e pagamento</div><div class="ct-stack">
  <div class="ct-grid">
    <div class="ct-f"><label for="ct_aluguel">Aluguel mensal (R$)</label><input id="ct_aluguel" data-k="aluguel" class="ct-num" type="number" inputmode="decimal" min="0" step="10"></div>
    <div class="ct-f"><span class="ct-lbl">Vence todo dia</span><div class="ct-chips" id="ct_venc"></div><input id="ct_vencOutro" class="ct-num" type="number" inputmode="numeric" min="1" max="31" hidden aria-label="Dia do vencimento"></div>
    <div class="ct-chips ct-full" id="ct_valores"></div>
  </div>
  <div class="ct-grid c3">
    <div class="ct-f"><label for="ct_pag1Data">1º pagamento em</label><input id="ct_pag1Data" data-k="pag1Data" type="date"></div>
    <div class="ct-f"><label for="ct_mesRef">Referente a</label><select id="ct_mesRef" data-k="mesRef"></select></div>
    <div class="ct-f"><label for="ct_primeiroValor">Valor do 1º</label><input id="ct_primeiroValor" data-k="primeiroValor" class="ct-num" type="number" inputmode="decimal" min="0" placeholder="igual"></div>
  </div>
  <p class="ct-hint">Deixe "Valor do 1º" vazio quando for o mês cheio. Se for diferente, o contrato diz que é proporcional.</p>
  <label class="ct-check"><input type="checkbox" id="ct_incluso" data-k="incluso">Escrever que água, luz, internet, condomínio e mobília já estão inclusos</label>
  <div class="ct-grid">
    <div class="ct-f"><label for="ct_forma">Forma de pagamento</label><select id="ct_forma" data-k="forma"><option value="">Não citar</option><option value="pix">PIX</option><option value="ted">Transferência</option><option value="dinheiro">Dinheiro</option></select></div>
    <div class="ct-f" id="ct_fchave" hidden><label for="ct_chavePix">Chave PIX</label><input id="ct_chavePix" data-k="chavePix" autocapitalize="off"></div>
  </div>
  <span class="ct-lbl">CAUÇÃO</span>
  <div class="ct-grid c3">
    <div class="ct-f"><label for="ct_caucao">Valor (R$)</label><input id="ct_caucao" data-k="caucao" class="ct-num" type="number" inputmode="decimal" min="0" step="10"></div>
    <div class="ct-f"><label for="ct_caucaoParcelas">Pagamento</label><select id="ct_caucaoParcelas" data-k="caucaoParcelas"><option value="1">À vista</option><option value="2">Parcelado em 2x</option></select></div>
    <div class="ct-f"><label for="ct_caucaoData" id="ct_lcd">Pago em</label><input id="ct_caucaoData" data-k="caucaoData" type="date"></div>
  </div>
  <div class="ct-grid" id="ct_fcau2" hidden>
    <div class="ct-f"><label for="ct_caucao1">Valor da 1ª (R$)</label><input id="ct_caucao1" data-k="caucao1" class="ct-num" type="number" inputmode="decimal" min="0" step="10" placeholder="metade"></div>
    <div class="ct-f"><label for="ct_caucao2Data">2ª parcela em</label><input id="ct_caucao2Data" data-k="caucao2Data" type="date"></div>
  </div>
  <p class="ct-hint" id="ct_cauhint" hidden></p>
</div></div>

<div class="ct-card"><div class="ct-h"><b>5</b>Prazo e assinatura</div><div class="ct-stack">
  <div class="ct-chips" id="ct_mesesChips"></div>
  <div class="ct-grid c3">
    <div class="ct-f"><label for="ct_inicio">Início</label><input id="ct_inicio" data-k="inicio" type="date"></div>
    <div class="ct-f"><label for="ct_termino">Término</label><input id="ct_termino" data-k="termino" type="date"></div>
    <div class="ct-f"><label for="ct_assinatura">Assinado em</label><input id="ct_assinatura" data-k="assinatura" type="date"></div>
  </div>
  <p class="ct-hint" id="ct_hintTermino"></p>
  <label class="ct-check"><input type="checkbox" id="ct_clausulaCurso" data-k="clausulaCurso" checked>Incluir a exceção a5 da multa (curso)</label>
  <div class="ct-f" id="ct_fcurso"><label for="ct_textoCurso">Texto da exceção a5</label><input id="ct_textoCurso" data-k="textoCurso" value="Encerre o curso acima de 10 meses e antes de 12 meses"></div>
  <div class="ct-f"><label for="ct_titulo">Título</label><select id="ct_titulo" data-k="titulo"><option>CONTRATO DE SUBLOCAÇÃO DE QUARTO RESIDENCIAL</option><option>CONTRATO DE DIVISÃO DE APARTAMENTO RESIDENCIAL</option></select></div>
</div></div>

<div class="ct-card"><div class="ct-h"><b>6</b>Gerar contrato</div><div class="ct-stack">
  <ul class="ct-alerts" id="ct_pend"></ul>
  <div class="ct-btns">
    <button type="button" class="ct-btn pri" id="ct_docx">Baixar Word</button>
    <button type="button" class="ct-btn pri" id="ct_pdf">Baixar PDF</button>
    <button type="button" class="ct-btn" id="ct_share" hidden>Enviar PDF…</button>
    <button type="button" class="ct-btn gh" id="ct_copiar">Copiar texto</button>
  </div>
  <div class="ct-reg ct-stack" id="ct_reg">
    <span class="ct-lbl">REGISTRAR NO PAINEL</span>
    <div class="ct-f"><label for="ct_inqNome">Nome do inquilino no painel</label><input id="ct_inqNome" autocapitalize="characters"></div>
    <label class="ct-check"><input type="checkbox" id="ct_lancar" checked><span id="ct_lancarTxt">Lançar o aluguel previsto nos meses vazios</span></label>
    <button type="button" class="ct-btn" id="ct_registrar">Registrar morador no quarto</button>
  </div>
</div></div>

<div class="ct-card"><div class="ct-h"><b>7</b>Prévia<small id="ct_resumo"></small></div>
  <div class="ct-paperwrap"><article class="ct-paper" id="ct_sheet" aria-label="Prévia do contrato"></article></div>
  <p class="ct-hint" style="margin-top:8px">Amarelo: preenchido. Vermelho: falta preencher.</p>
</div>
<div class="ct-toast" id="ct_toast" hidden></div>`;
}

/* ---------- chips ---------- */
function chips(el,itens,ativo,onPick){
  el.innerHTML='';
  itens.forEach(it=>{ const b=document.createElement('button'); b.type='button'; b.className='ct-chip';
    b.innerHTML=escH(it.label)+(it.sub?'<small>'+escH(it.sub)+'</small>':''); b.setAttribute('aria-pressed',String(it.v===ativo));
    b.onclick=()=>onPick(it.v); el.append(b); });
}
function desenharAps(){
  const lista=aps();
  if(st.ai>=lista.length) { st.ai=-1; st.qi=-1; }
  chips($('aps'),lista.map((ap,i)=>({v:i,label:ap.nome,sub:ap.quartos.length+' quartos'})),st.ai,v=>{
    st.ai=v; st.qi=-1; $('end').value=endereco(apAtual()); desenharAps(); desenharQuartos(); desenharValores(); atualizar(); });
  if(!lista.length) $('aps').innerHTML='<p class="ct-hint">Nenhum apartamento no painel. Cadastre na aba Lançar.</p>';
}
function desenharQuartos(){
  const ap=apAtual(), el=$('quartos');
  if(!ap){ el.innerHTML='<p class="ct-hint">Escolha o apartamento.</p>'; return; }
  chips(el,ap.quartos.map((q,i)=>({v:i,label:q.quarto,sub:q.inquilino?q.inquilino:'vago'})),st.qi,v=>{
    st.qi=v; const q=ap.quartos[v], vt=valorTipico(q);
    if(vt && !tocado.has('aluguel')) $('aluguel').value=vt;
    desenharQuartos(); sincronizar(); desenharValores(); atualizar(); });
}
function desenharValores(){
  const ap=apAtual(), el=$('valores'); el.innerHTML='';
  if(!ap) return;
  const vals=[...new Set(ap.quartos.map(valorTipico).filter(v=>v>0))].sort((a,b)=>a-b);
  if(!vals.length) return;
  const s=document.createElement('span'); s.className='ct-hint'; s.style.alignSelf='center'; s.textContent='Valores deste apto:'; el.append(s);
  vals.forEach(v=>{ const b=document.createElement('button'); b.type='button'; b.className='ct-chip'; b.textContent=dinheiro(v);
    b.setAttribute('aria-pressed',String(+$('aluguel').value===v)); b.onclick=()=>{ $('aluguel').value=v; tocado.add('aluguel'); sincronizar(); desenharValores(); atualizar(); }; el.append(b); });
}
function desenharVenc(){
  chips($('venc'),[5,7,10].map(v=>({v,label:'dia '+v})).concat([{v:'outro',label:'outro'}]),st.vencOutro?'outro':st.vencimento,v=>{
    st.vencOutro=v==='outro'; const i=$('vencOutro');
    if(st.vencOutro){ i.hidden=false; if(!i.value) i.value=st.vencimento; i.focus(); } else { st.vencimento=v; i.hidden=true; }
    desenharVenc(); atualizar(); });
}
function desenharMeses(){ chips($('mesesChips'),[3,6,12].map(v=>({v,label:v+' meses'})),st.meses,v=>{ st.meses=v; tocado.delete('termino'); sincronizar(); desenharMeses(); atualizar(); }); }
function setSexo(v){
  st.sexo=v==='F'?'F':'M';
  $('sexo').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.v===st.sexo)));
  const n=$('nacionalidade'); if(/^brasileir[oa]$/i.test(n.value.trim())) n.value=st.sexo==='F'?'brasileira':'brasileiro';
}

/* ---------- automáticos ---------- */
function preencherMeses(){
  const base=parseISO($('pag1Data').value)||parseISO(hojeISO()), sel=$('mesRef'), atual=sel.value;
  sel.innerHTML='';
  for(let i=-1;i<=3;i++){ let m=base.m-1+i, y=base.y+Math.floor(m/12); m=((m%12)+12)%12;
    const o=document.createElement('option'); o.value=MESES_EXT[m]; o.dataset.y=y; o.dataset.m=m; o.textContent=MESES_EXT[m]+' de '+y; sel.append(o); }
  if(tocado.has('mesRef') && [...sel.options].some(o=>o.value===atual)) sel.value=atual;
  else sel.value=MESES_EXT[(base.m-1+(base.d>=20?1:0))%12];
}
function sincronizar(){
  if(!tocado.has('caucao')) $('caucao').value=$('aluguel').value;
  if(!tocado.has('caucaoData')) $('caucaoData').value=$('pag1Data').value;
  if(!tocado.has('termino')) $('termino').value=addMeses($('inicio').value,st.meses-1);
  preencherMeses();
  $('fchave').hidden=$('forma').value!=='pix';
  $('fcurso').hidden=!$('clausulaCurso').checked;
  const parc=+$('caucaoParcelas').value===2;
  $('lcd').textContent=parc?'1ª parcela em':'Pago em';
  $('fcau2').hidden=!parc; $('cauhint').hidden=!parc;
  if(!tocado.has('caucao2Data')) $('caucao2Data').value=addMeses($('caucaoData').value,1);
  if(parc){ const cp=caucaoPartes({caucao:$('caucao').value,caucaoParcelas:'2',caucao1:$('caucao1').value});
    $('caucao1').placeholder=cp.c?'metade: '+dinheiro(Math.round(cp.c/2*100)/100).replace('R$',''):'metade';
    $('cauhint').textContent=cp.c? '1ª de '+dinheiro(cp.c1)+' · 2ª de '+dinheiro(Math.max(0,cp.c2))+(cp.c1>=cp.c?' — a 1ª não pode ser o total':'') : 'Informe o valor do caução.'; }
  const padrao=addMeses($('inicio').value,st.meses-1);
  $('hintTermino').innerHTML = $('termino').value===padrao
    ? 'Término como nos seus contratos: '+(st.meses-1)+' meses após o início.'
    : 'Término ajustado à mão. <button type="button" class="ct-link" id="ct_resetT">Voltar ao cálculo padrão</button>';
  const r=$('resetT'); if(r) r.onclick=()=>{ tocado.delete('termino'); sincronizar(); atualizar(); };
  const ap=apAtual(); $('endhint').textContent = ap && !ap.endereco && !ENDERECOS[String(ap.id)] ? 'Endereço não cadastrado para este apto. Digite uma vez; fica salvo no painel.' : '';
}

/* ---------- estado e contrato ---------- */
function estado(){
  const ap=apAtual(), q=ap&&ap.quartos[st.qi], v=k=>$(k).value.trim(), forma=$('forma').value;
  let formaTexto='';
  if(forma==='pix') formaTexto=v('chavePix')?'via PIX, na chave '+v('chavePix'):'via PIX';
  else if(forma==='ted') formaTexto='por transferência bancária';
  else if(forma==='dinheiro') formaTexto='em dinheiro';
  const end=v('end');
  return { titulo:$('titulo').value, sexo:st.sexo,
    nome:v('nome').toUpperCase(), nacionalidade:v('nacionalidade'), estadoCivil:$('estadoCivil').value, profissao:v('profissao'),
    naturalidade:v('naturalidade').toUpperCase(), nascimento:v('nascimento'), rg:v('rg'), rgEmissor:v('rgEmissor').toUpperCase(), cpf:v('cpf'),
    mae:v('mae').toUpperCase(), pai:v('pai').toUpperCase(),
    quarto:q?numQuarto(q):'', imovelTexto: ap&&end ? end+', apto '+ap.id : '',
    aluguel:v('aluguel'), primeiroValor:v('primeiroValor'), pag1Data:$('pag1Data').value, mesRef:$('mesRef').value, vencimento:st.vencimento,
    incluso:$('incluso').checked, formaTexto,
    caucao:v('caucao'), caucaoParcelas:$('caucaoParcelas').value, caucaoData:$('caucaoData').value, caucao1:v('caucao1'), caucao2Data:$('caucao2Data').value,
    meses:st.meses, inicio:$('inicio').value, termino:$('termino').value, assinatura:$('assinatura').value,
    clausulaCurso:$('clausulaCurso').checked, textoCurso:v('textoCurso') };
}
function runsHTML(runs){ return runs.map(r=>{ let h=escH(r.t); if(r.b) h='<b>'+h+'</b>'; if(r.miss) return '<mark class="miss">'+h+'</mark>'; if(r.f) return '<mark>'+h+'</mark>'; return h; }).join(''); }
function pendencias(s,blocks){
  const P=[], faltas=[...new Set(blocks.flatMap(b=>b.runs).filter(r=>r.miss).map(r=>r.t.replace(/[\[\]]/g,'')))];
  if(faltas.length) P.push({t:'Falta: '+faltas.join(', ')+'.',ko:1,bloq:1});
  if(s.cpf&&!cpfValido(s.cpf)) P.push({t:'O CPF '+s.cpf+' não confere (dígito verificador). Confira no documento.',ko:1,bloq:1});
  if(s.nascimento){ const a=idade(s.nascimento); if(a===null) P.push({t:'Nascimento fora do formato dd/mm/aaaa.',ko:1,bloq:1}); else if(a<18) P.push({t:'Morador com '+a+' anos: o contrato diz "maior". Menor precisa de responsável assinando.',ko:1}); }
  if(s.inicio&&s.termino&&s.termino<=s.inicio) P.push({t:'O término está antes do início.',ko:1,bloq:1});
  const cp=caucaoPartes(s);
  if(cp.n===2&&cp.c>0){
    if(cp.c1<=0||cp.c1>=cp.c) P.push({t:'Caução em 2x: a 1ª parcela precisa ser maior que zero e menor que o total ('+dinheiro(cp.c)+').',ko:1,bloq:1});
    if(s.caucaoData&&s.caucao2Data&&s.caucao2Data<=s.caucaoData) P.push({t:'Caução em 2x: a 2ª parcela vence antes (ou no mesmo dia) da 1ª.',ko:1,bloq:1});
  }
  if(!s.cpf) P.push({t:'Sem CPF: o contrato sai só com o RG.'});
  const q=apAtual()&&apAtual().quartos[st.qi]; if(q&&q.inquilino) P.push({t:q.quarto+' está com '+q.inquilino+' no painel. Confira se é o quarto certo.'});
  return P;
}
function atualizar(){
  if(!montado) return;
  const s=estado(), blocks=montarContrato(s); ultimo={s,blocks};
  $('sheet').innerHTML=blocks.map(b=>{
    if(b.k==='title') return '<p class="t">'+runsHTML(b.runs)+'</p>';
    if(b.k==='h') return '<p class="h">'+runsHTML(b.runs)+'</p>';
    if(b.k==='li') return '<p class="li">'+runsHTML(b.runs)+'</p>';
    if(b.k==='local') return '<p class="lc">'+runsHTML(b.runs)+'</p>';
    if(b.k==='sig') return '<div class="sg"><b>'+runsHTML(b.runs)+'</b><small>'+escH((b.sub?b.sub+' · ':'')+b.papel)+'</small></div>';
    return '<p>'+runsHTML(b.runs)+'</p>'; }).join('');
  const P=pendencias(s,blocks), ul=$('pend'); ul.innerHTML='';
  if(!P.length) ul.innerHTML='<li class="ok">Tudo preenchido. Confira a prévia e baixe.</li>';
  P.forEach(p=>{ const li=document.createElement('li'); if(p.ko) li.className='ko'; li.textContent=p.t; ul.append(li); });
  const bloq=P.some(p=>p.bloq); ['docx','pdf','share'].forEach(k=>$(k).disabled=bloq);
  const a=idade(s.nascimento); $('tIdade').innerHTML=a===null?'':'<span class="ct-tag'+(a<18?' ko':'')+'">'+a+' anos</span>';
  $('tCpf').innerHTML=!s.cpf?'':(cpfValido(s.cpf)?'<span class="ct-tag">válido</span>':'<span class="ct-tag ko">não confere</span>');
  const ap=apAtual(), q=ap&&ap.quartos[st.qi];
  $('resumo').textContent=ap?(ap.nome+(q?' · '+q.quarto:'')):'';
  // registro no painel
  if(!tocado.has('inqNome')){ const p=(s.nome||'').split(/\s+/).filter(Boolean); $('inqNome').value=p.length>1?p[0]+' '+p[p.length-1]:(p[0]||''); }
  const ref=mesRefInfo(); $('lancarTxt').textContent = ref && ref.y===2026 && +s.aluguel>0
    ? 'Lançar '+dinheiro(+s.aluguel)+' como aluguel previsto de '+MESES[ref.m]+' a DEZ (só nos meses vazios)'
    : 'Lançar o aluguel previsto nos meses vazios (o painel guarda só 2026)';
  $('lancar').disabled=!(ref&&ref.y===2026&&+s.aluguel>0);
  $('registrar').disabled=!(q&&$('inqNome').value.trim());
}
function mesRefInfo(){ const o=$('mesRef').selectedOptions[0]; return o?{y:+o.dataset.y,m:+o.dataset.m}:null; }

/* ---------- registrar no painel ---------- */
function registrar(){
  const ap=apAtual(), q=ap&&ap.quartos[st.qi], nome=$('inqNome').value.trim().toUpperCase();
  if(!q||!nome) return;
  q.inquilino=nome;
  let n=0; const ref=mesRefInfo(), v=+$('aluguel').value||0;
  if($('lancar').checked && ref && ref.y===2026 && v>0){
    for(let m=ref.m;m<12;m++){ const c=q.meses[MESES[m]]; if(c && !c.v && !c.pago && !(c.pg>0)){ c.v=v; n++; } }
  }
  if(typeof save==='function') save();
  desenharQuartos(); atualizar();
  toast(nome+' registrado no '+q.quarto+(n?' e aluguel lançado em '+n+(n>1?' meses.':' mês.'):'.'));
}

/* ---------- leitura dos documentos (API do Claude) ---------- */
const ehClaude=k=>/^sk-ant-/.test(k||'');
function cfgAI(){ try{ return JSON.parse(localStorage.getItem(AI_KEY)||'null'); }catch(e){ return null; } }
function mostraCfg(){ const c=cfgAI(); $('keydel').hidden=!c; $('cfg').textContent=c?('Leitura automática pelo '+(ehClaude(c.key)?'Claude':'Gemini')+' · alterar'):'Configurar leitura automática'; atualizarBtnLer(); }
function atualizarBtnLer(){ $('ler').disabled=!arquivos.length; }
const PROMPT=`Você vai ver fotos ou páginas de documentos pessoais brasileiros (RG, CIN, CNH, CPF, certidão de nascimento/casamento, comprovante) de UMA pessoa que vai alugar um quarto.
Extraia os dados dela e responda somente com um objeto JSON neste formato:
{"nome":"","sexo":"","estadoCivil":"","nacionalidade":"","profissao":"","naturalidade":"","nascimento":"","rg":"","rgEmissor":"","cpf":"","mae":"","pai":"","avisos":[]}
Regras:
- nome, mae, pai: completos, em MAIÚSCULAS, sem abreviar, exatamente como impressos.
- sexo: "M" ou "F" só se algum documento disser (campo Sexo); senão "".
- estadoCivil: um de "solteiro","casado","divorciado","viúvo","união estável" só se constar em certidão; senão "".
- nacionalidade: "brasileiro" ou "brasileira" se for documento brasileiro (use o sexo se souber), senão o que constar.
- naturalidade: "CIDADE/UF" em maiúsculas (ex.: "IRATI/PR").
- nascimento: "dd/mm/aaaa".
- rg: o número do RG como impresso (na CNH, o campo "DOC. IDENTIDADE"). rgEmissor: órgão + UF, ex. "SESP PR" ou "SSP SP".
- cpf: "000.000.000-00".
- profissao: só se aparecer em algum documento.
- Campo que não aparece: "". Nunca invente nem complete dígitos.
- avisos: frases curtas em português sobre o que conferir: dígito ilegível ou duvidoso, documentos de pessoas diferentes, divergência entre documentos, documento vencido, foto cortada.`;
function b64(blob){ return new Promise((ok,erro)=>{ const r=new FileReader(); r.onload=()=>ok(String(r.result).split(',')[1]); r.onerror=erro; r.readAsDataURL(blob); }); }
async function reduzir(file,max=1600){
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((ok,erro)=>{ const i=new Image(); i.onload=()=>ok(i); i.onerror=()=>erro(new Error('decod')); i.src=url; });
    const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)), c=document.createElement('canvas');
    c.width=Math.round(img.naturalWidth*k); c.height=Math.round(img.naturalHeight*k);
    const g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(img,0,0,c.width,c.height);
    return await new Promise(ok=>c.toBlob(ok,'image/jpeg',0.88));
  } finally { URL.revokeObjectURL(url); }
}
const MODELO='claude-sonnet-5-5', MODELO_RESERVA='claude-haiku-4-5-20251001';
function explicaErro(e){
  const m=e.msg||'';
  if(e.http===401||/x-api-key|authentication|API key not valid|API_KEY_INVALID/i.test(m)) return 'A chave da API não foi aceita. Confira em "Configurar leitura automática".';
  if(/credit balance|billing|purchase credits/i.test(m)) return 'Sua conta da API da Anthropic está sem créditos. Adicione créditos em console.anthropic.com (Billing) e toque em ler de novo.';
  if(e.http===403&&/SERVICE_DISABLED|has not been used|is disabled/i.test(m)) return 'A API do Gemini não está ativada no projeto dessa chave. Ative a "Generative Language API" no Google Cloud ou crie a chave em aistudio.google.com.';
  if(e.http===403) return 'A chave não tem permissão para usar a API ('+m.slice(0,120)+').';
  if(e.http===429||e.http===529||e.http===503||/overloaded|rate limit|RESOURCE_EXHAUSTED|quota/i.test(m)) return 'A API está ocupada ou o limite de uso foi atingido. Tente de novo em alguns minutos.';
  if(e.http===413||/too large|exceeds|size/i.test(m)) return 'Arquivos grandes demais para a API. Mande menos fotos de uma vez ou um PDF por vez.';
  if(/image|media_type|base64/i.test(m)) return 'A API não aceitou uma das imagens. Tire a foto de novo ou mande em PDF. Detalhe: '+m.slice(0,140);
  if(/model/i.test(m)) return 'O modelo de leitura não está disponível nesta conta da API. Detalhe: '+m.slice(0,140);
  if(e.http===200) return 'A leitura voltou vazia: '+m+'. Tente fotos mais nítidas.';
  return 'A API recusou o pedido (erro '+e.http+'): '+(m.slice(0,180)||'sem detalhe')+'.';
}
async function falhaHttp(r){ const t=await r.text().catch(()=>''); let m=''; try{ const j=JSON.parse(t); m=(j.error&&(j.error.message||j.error.status))||''; }catch(_){ m=t.slice(0,200); } return {http:r.status,msg:m}; }
async function lerClaude(key,modelo,content){
  const chamar=model=>fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:ctl.signal,
    headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model,max_tokens:1500,messages:[{role:'user',content}]})});
  let r=await chamar(modelo||MODELO);
  if(!r.ok){ const e=await falhaHttp(r);
    if((e.http===404||e.http===400)&&/model/i.test(e.msg)&&!modelo){ r=await chamar(MODELO_RESERVA); if(!r.ok) throw await falhaHttp(r); }
    else throw e; }
  const j=await r.json(); return (j.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('');
}
/* Gemini: mesmo conteúdo, convertido para inline_data; a chave vai no cabeçalho (nunca na URL) */
const GEMINI_MODELOS=['gemini-3.8-flash','gemini-flash-latest','gemini-2.5-flash'];
async function lerGemini(key,content){
  const parts=content.map(x=> x.type==='text' ? {text:x.text} : {inline_data:{mime_type:x.source.media_type,data:x.source.data}});
  const body=JSON.stringify({contents:[{role:'user',parts}],generationConfig:{responseMimeType:'application/json',temperature:0}});
  let ultimo=null;
  for(const m of GEMINI_MODELOS){
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+m+':generateContent',{method:'POST',signal:ctl.signal,
      headers:{'content-type':'application/json','x-goog-api-key':key},body});
    if(r.ok){ const j=await r.json(), cand=(j.candidates||[])[0];
      const t=cand&&cand.content&&(cand.content.parts||[]).map(p=>p.text||'').join('');
      if(!t) throw {http:200,msg:'resposta vazia ('+((cand&&cand.finishReason)||(j.promptFeedback&&j.promptFeedback.blockReason)||'sem motivo')+')'};
      return t; }
    ultimo=await falhaHttp(r);
    if(!(r.status===404 || (r.status===400&&/model/i.test(ultimo.msg)))) throw ultimo;   // só troca de modelo se o modelo não existir
  }
  throw ultimo;
}
async function ler(){
  const c=cfgAI();
  if(!c||!c.key){ $('cfgbox').hidden=false; status('Para ler os documentos, cole a chave da API abaixo. Ou preencha os dados à mão.'); $('key').focus(); return; }
  $('ler').disabled=true; $('parar').hidden=false; $('avisos').innerHTML='';
  ctl=new AbortController();
  try{
    status('Preparando os arquivos…',1);
    const content=[];
    for(const a of arquivos){
      try{
        if(a.f.type==='application/pdf'){ if(a.f.size>25e6){ aviso(a.f.name+': PDF grande demais (máx. 25 MB).',1); continue; }
          content.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:await b64(a.f)}}); }
        else content.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:await b64(await reduzir(a.f))}});
      }catch(e){ aviso(a.f.name+': não consegui abrir este arquivo. No iPhone, prefira "Mais compatível" nas fotos ou mande em PDF.',1); }
    }
    if(!content.length){ status(''); return; }
    content.push({type:'text',text:PROMPT});
    status('Lendo '+(content.length-1)+(content.length>2?' arquivos':' arquivo')+'… leva de 10 a 40 segundos.',1);
    const txt = ehClaude(c.key) ? await lerClaude(c.key,c.model,content) : await lerGemini(c.key,content);
    const a1=txt.indexOf('{'), a2=txt.lastIndexOf('}'); if(a1<0||a2<a1) throw {json:1};
    aplicar(JSON.parse(txt.slice(a1,a2+1)));
    status('Pronto. Os campos em verde vieram dos documentos. Confira cada um.');
  }catch(e){
    if(e&&e.name==='AbortError') status('Leitura interrompida.');
    else if(e&&e.http) status(explicaErro(e));
    else if(e&&e.json) status('A resposta veio fora do formato. Toque em ler de novo.');
    else status('Sem conexão com a API agora. Confira a internet e tente de novo.');
  }finally{ $('parar').hidden=true; atualizarBtnLer(); }
}
function aplicar(r){
  const set=(k,v)=>{ v=(v==null?'':String(v)).trim(); if(!v) return; const el=$(k); el.value=v; el.classList.add('ct-lido'); };
  set('nome',r.nome); set('profissao',r.profissao); set('naturalidade',r.naturalidade); set('nascimento',r.nascimento);
  set('rg',r.rg); set('rgEmissor',r.rgEmissor); if(r.cpf) set('cpf',formataCPF(r.cpf)); set('mae',r.mae); set('pai',r.pai);
  if(r.sexo==='M'||r.sexo==='F') setSexo(r.sexo);
  if(r.nacionalidade) set('nacionalidade',String(r.nacionalidade).toLowerCase());
  if(r.estadoCivil && [...$('estadoCivil').options].some(o=>o.value===r.estadoCivil)){ $('estadoCivil').value=r.estadoCivil; $('estadoCivil').classList.add('ct-lido'); }
  (Array.isArray(r.avisos)?r.avisos:[]).forEach(t=>aviso(String(t)));
  if(!r.sexo) aviso('Confira o sexo (muda "nascido/nascida" e "portador/portadora" no contrato).');
  atualizar();
}
function status(t,spin){ $('status').innerHTML=(spin?'<span class="ct-spin" aria-hidden="true"></span>':'')+escH(t); }
function aviso(t,ko){ const li=document.createElement('li'); if(ko) li.className='ko'; li.textContent=t; $('avisos').append(li); }

/* ---------- arquivos ---------- */
function addArquivos(list){
  for(const f of list){ if(!/^image\/|application\/pdf/.test(f.type)){ toast(f.name+': use foto ou PDF.'); continue; } arquivos.push({f,url:f.type.startsWith('image/')?URL.createObjectURL(f):null}); }
  desenharThumbs();
}
function desenharThumbs(){
  const el=$('thumbs'); el.innerHTML='';
  arquivos.forEach((a,i)=>{ const d=document.createElement('div'); d.className='ct-thumb';
    d.innerHTML=a.url?'<img alt="'+escH(a.f.name)+'" src="'+a.url+'">':'<span>PDF<br>'+escH(a.f.name.slice(0,24))+'</span>';
    const x=document.createElement('button'); x.type='button'; x.textContent='×'; x.setAttribute('aria-label','Remover '+a.f.name);
    x.onclick=()=>{ if(a.url) URL.revokeObjectURL(a.url); arquivos.splice(i,1); desenharThumbs(); }; d.append(x); el.append(d); });
  atualizarBtnLer();
}

/* ---------- saída ---------- */
function nomeArquivo(ext){
  const s=ultimo.s, ap=apAtual(), p=(s.nome||'MORADOR').split(/\s+/), curto=p.length>1?p[0]+' '+p[p.length-1]:p[0];
  return 'CONTRATO '+(ap?'APTO '+ap.id+' ':'')+'Q'+(s.quarto||'')+' - '+curto+'.'+ext;
}
async function gerar(ext){
  if(ext==='docx') return gerarDocx(ultimo.blocks,await lib('docx'));
  return gerarPdf(ultimo.blocks,(await lib('jspdf')).jsPDF);
}
async function baixar(ext){
  const btn=$(ext); btn.disabled=true;
  try{
    const blob=await gerar(ext), url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=nomeArquivo(ext); document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    toast(ext==='docx'?'Word gerado.':'PDF gerado.');
  }catch(e){ toast(e&&e.message==='lib'?'Sem internet para carregar o gerador. Tente de novo conectado.':'Não foi possível gerar o arquivo.'); }
  finally{ atualizar(); }
}
async function compartilhar(){
  const btn=$('share'); btn.disabled=true;
  try{
    const blob=await gerar('pdf'), file=new File([blob],nomeArquivo('pdf'),{type:'application/pdf'});
    await navigator.share({files:[file],title:file.name});
  }catch(e){ if(!(e&&e.name==='AbortError')) toast('Não deu para abrir o compartilhamento. Use "Baixar PDF".'); }
  finally{ atualizar(); }
}
let tt; function toast(t){ const el=$('toast'); el.textContent=t; el.hidden=false; clearTimeout(tt); tt=setTimeout(()=>el.hidden=true,3500); }

/* ---------- montagem ---------- */
function ligar(){
  const hoje=hojeISO();
  ['pag1Data','inicio','assinatura','caucaoData'].forEach(k=>$(k).value=hoje);
  root.querySelectorAll('[data-k]').forEach(el=>{
    const h=()=>{ tocado.add(el.dataset.k); el.classList.remove('ct-lido'); sincronizar(); if(el.dataset.k==='aluguel') desenharValores(); atualizar(); };
    el.addEventListener('input',h); el.addEventListener('change',h);
  });
  $('sexo').querySelectorAll('button').forEach(b=>b.onclick=()=>{ setSexo(b.dataset.v); atualizar(); });
  $('nascimento').addEventListener('input',e=>{ let d=e.target.value.replace(/\D/g,'').slice(0,8); if(d.length>4) d=d.slice(0,2)+'/'+d.slice(2,4)+'/'+d.slice(4); else if(d.length>2) d=d.slice(0,2)+'/'+d.slice(2); e.target.value=d; });
  $('cpf').addEventListener('blur',e=>{ e.target.value=formataCPF(e.target.value); atualizar(); });
  $('vencOutro').addEventListener('input',e=>{ const d=parseInt(e.target.value); if(d>=1&&d<=31){ st.vencimento=d; atualizar(); } });
  $('end').addEventListener('input',()=>{ sincronizar(); atualizar(); });
  $('end').addEventListener('change',()=>{ const ap=apAtual(), v=$('end').value.trim(); if(ap&&v&&v!==endereco(ap)){ ap.endereco=v; if(typeof save==='function') save(); sincronizar(); } });
  $('inqNome').addEventListener('input',()=>{ tocado.add('inqNome'); atualizar(); });
  $('arq').addEventListener('change',e=>{ addArquivos(e.target.files); e.target.value=''; });
  $('ler').onclick=ler; $('parar').onclick=()=>ctl&&ctl.abort();
  $('cfg').onclick=()=>{ $('cfgbox').hidden=!$('cfgbox').hidden; };
  $('keysave').onclick=()=>{ const k=$('key').value.replace(/\s+/g,''); const msg=$('keymsg');
    if(k.length<20){ msg.className='ct-hint ct-erro'; msg.textContent=k?'Essa chave parece incompleta. Copie de novo pelo ícone de copiar no AI Studio e cole aqui.':'Cole a chave no campo antes de salvar.'; msg.hidden=false; return; }
    msg.hidden=true;
    try{ localStorage.setItem(AI_KEY,JSON.stringify({key:k})); }catch(e){} $('key').value=''; $('cfgbox').hidden=true; mostraCfg(); toast('Chave salva neste aparelho.'); };
  $('keydel').onclick=()=>{ try{ localStorage.removeItem(AI_KEY); }catch(e){} mostraCfg(); toast('Chave apagada deste aparelho.'); };
  $('docx').onclick=()=>baixar('docx'); $('pdf').onclick=()=>baixar('pdf');
  $('share').hidden=!(navigator.canShare&&navigator.canShare({files:[new File(['x'],'t.pdf',{type:'application/pdf'})]}));
  $('share').onclick=compartilhar;
  $('copiar').onclick=async()=>{ const t=textoPlano(ultimo.blocks);
    try{ await navigator.clipboard.writeText(t); toast('Texto copiado.'); }catch(_){ const r=document.createRange(); r.selectNodeContents($('sheet')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); toast('Texto selecionado. Copie pelo menu.'); } };
  $('registrar').onclick=registrar;
}
window.Contrato={
  render(el){
    root=el;
    if(!montado || !el.querySelector('#ct_sheet')){
      el.innerHTML=html(); montado=true; ligar();
      desenharVenc(); desenharMeses(); mostraCfg();
    }
    desenharAps(); desenharQuartos(); desenharValores(); sincronizar(); atualizar();
    lib('jspdf').catch(()=>{}); lib('docx').catch(()=>{}); // pré-carrega para o botão responder rápido
  }
};

})();
