insert into public.asset_taxonomy_nodes(code,name,level,jurisdiction,sort_order) values
('BR','Brasil','jurisdiction','BR',10),('US','Estados Unidos','jurisdiction','US',20) on conflict(code) do nothing;
insert into public.asset_taxonomy_nodes(parent_id,code,name,level,jurisdiction,sort_order)
select p.id,v.code,v.name,'class',p.jurisdiction,v.sort_order from (values
('BR','BR.RV','Renda variável',10),('BR','BR.RF','Renda fixa',20),('BR','BR.FUNDO','Fundos',30),('BR','BR.DERIVATIVO','Derivativos',40),('BR','BR.PREVIDENCIA','Previdência',50),('BR','BR.CRIPTO','Criptoativos',60),('BR','BR.ALTERNATIVO','Alternativos',70),
('US','US.RV','Renda variável',10),('US','US.RF','Renda fixa',20),('US','US.FUNDO','Fundos',30),('US','US.ALTERNATIVO','Alternativos',40)
) v(parent_code,code,name,sort_order) join public.asset_taxonomy_nodes p on p.code=v.parent_code on conflict(code) do nothing;
insert into public.asset_taxonomy_nodes(parent_id,code,name,level,jurisdiction,sort_order)
select p.id,v.code,v.name,'type',p.jurisdiction,v.sort_order from (values
('BR.RV','BR.RV.ACAO','Ações',10),('BR.RV','BR.RV.BDR','BDRs',20),('BR.RV','BR.RV.ETF','ETFs',30),
('BR.FUNDO','BR.FUNDO.FII','FII',10),('BR.FUNDO','BR.FUNDO.FIAGRO','FIAGRO',20),('BR.FUNDO','BR.FUNDO.FIDC','FIDC',30),('BR.FUNDO','BR.FUNDO.FIP','FIP',40),
('BR.RF','BR.RF.TESOURO','Títulos públicos',10),('BR.RF','BR.RF.BANCARIA','Emissão bancária',20),('BR.RF','BR.RF.CORPORATIVA','Crédito privado corporativo',30),('BR.RF','BR.RF.SECURITIZACAO','Securitização',40),
('US.RV','US.RV.STOCK','Stocks',10),('US.RV','US.RV.REIT','REITs',20),('US.FUNDO','US.FUNDO.ETF','ETFs',10),('US.RF','US.RF.TREASURY','U.S. Treasuries',10),('US.RF','US.RF.CORPORATE','Corporate Bonds',20)
) v(parent_code,code,name,sort_order) join public.asset_taxonomy_nodes p on p.code=v.parent_code on conflict(code) do nothing;
