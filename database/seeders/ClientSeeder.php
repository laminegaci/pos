<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    public function run(): void
    {
        $clients = [
            ['name' => 'Entreprise Benali Construction', 'email' => 'contact@benali-btp.dz', 'phone' => '0550 12 34 56', 'city' => 'Alger', 'type' => 'professionnel'],
            ['name' => 'Karim Bouzid', 'email' => 'k.bouzid@gmail.com', 'phone' => '0661 98 76 54', 'city' => 'Oran', 'type' => 'particulier'],
            ['name' => 'SARL Platrerie Moderne', 'email' => 'info@platrerie-moderne.dz', 'phone' => '0770 11 22 33', 'city' => 'Constantine', 'type' => 'professionnel'],
            ['name' => 'Amine Haddad', 'phone' => '0555 44 33 22', 'city' => 'Blida', 'type' => 'particulier'],
            ['name' => 'BTP Ouest Algérie', 'email' => 'contact@btp-ouest.dz', 'phone' => '0540 00 11 22', 'address' => 'Zone Industrielle', 'city' => 'Tlemcen', 'type' => 'professionnel'],
            ['name' => 'Sofiane Meziani', 'email' => 's.meziani@outlook.fr', 'phone' => '0672 33 22 11', 'city' => 'Annaba', 'type' => 'particulier'],
            ['name' => 'Les Frères Zerrouki', 'phone' => '0661 55 44 33', 'address' => 'Rue de la Liberté', 'city' => 'Sétif', 'type' => 'professionnel'],
            ['name' => 'Nadia Belkacem', 'email' => 'nadia.b@yahoo.fr', 'phone' => '0550 77 88 99', 'city' => 'Alger', 'type' => 'particulier'],
            ['name' => 'Construction Plus', 'email' => 'admin@construction-plus.dz', 'phone' => '0770 33 44 55', 'city' => 'Béjaïa', 'type' => 'professionnel'],
            ['name' => 'Youcef Amrani', 'phone' => '0555 11 22 33', 'city' => 'Tizi Ouzou', 'type' => 'particulier'],
        ];

        foreach ($clients as $c) {
            Client::create($c);
        }
    }
}
