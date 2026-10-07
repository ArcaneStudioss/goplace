-- A garantia passa a vir da configuracao do site (6 meses a 1 ano); tira a garantia fixa dos produtos de exemplo.
update loja.produtos set laudo = laudo - 'garantia' where exemplo and laudo->>'garantia' like '3 meses%';
