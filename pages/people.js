export default function People(){
  const team = [
    { name: 'Dr. Alice Neural', title: 'Founder, Lead Researcher' },
    { name: 'Dr. Bob Spike', title: 'Senior Scientist' }
  ]

  return (
    <main className="container">
      <h1>People</h1>
      <p>Meet the core team behind Mimic Neuroscience.</p>
      <div className="grid">
        {team.map((p)=> (
          <div key={p.name} className="card">
            <h3>{p.name}</h3>
            <p className="muted">{p.title}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
