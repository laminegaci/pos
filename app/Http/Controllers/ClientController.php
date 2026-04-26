<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Exports\ClientExport;
use App\Models\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

class ClientController extends Controller
{
    public function index(): Response
    {
        $clients = Client::withCount('sales')
            ->withSum('sales', 'total')
            ->orderBy('name')
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'email' => $c->email,
                'phone' => $c->phone,
                'address' => $c->address,
                'city' => $c->city,
                'type' => $c->type,
                'notes' => $c->notes,
                'active' => $c->active,
                'sales_count' => $c->sales_count ?? 0,
                'total_spent' => (float) ($c->sales_sum_total ?? 0),
                'last_purchase' => optional($c->sales()->latest()->first())->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Clients/Index', [
            'clients' => $clients,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'type' => 'required|in:particulier,professionnel',
            'notes' => 'nullable|string',
            'active' => 'boolean',
        ]);

        Client::create($validated);

        return redirect()->route('clients.index')->with('success', 'Client créé.');
    }

    public function update(Request $request, Client $client): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'address' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:100',
            'type' => 'required|in:particulier,professionnel',
            'notes' => 'nullable|string',
            'active' => 'boolean',
        ]);

        $client->update($validated);

        return redirect()->route('clients.index')->with('success', 'Client mis à jour.');
    }

    public function destroy(Client $client): RedirectResponse
    {
        $client->delete();

        return redirect()->route('clients.index')->with('success', 'Client supprimé.');
    }

    public function export()
    {
        return Excel::download(new ClientExport, 'clients-'.now()->format('Y-m-d').'.xlsx');
    }
}
