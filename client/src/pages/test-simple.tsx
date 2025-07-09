import { useState } from 'react';

export default function TestSimple() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');

  console.log('TestSimple component rendered, count:', count);

  return (
    <div style={{ padding: '20px', background: 'black', color: 'white', minHeight: '100vh' }}>
      <h1>Simple Test Component</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>Count: {count}</p>
        <button 
          onClick={() => {
            console.log('Button clicked! Current count:', count);
            setCount(count + 1);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Click me ({count})
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p>Message: {message}</p>
        <input
          type="text"
          value={message}
          onChange={(e) => {
            console.log('Input changed:', e.target.value);
            setMessage(e.target.value);
          }}
          placeholder="Type something..."
          style={{
            padding: '10px',
            backgroundColor: '#1a1a1a',
            color: 'white',
            border: '1px solid #333',
            borderRadius: '4px',
            width: '300px'
          }}
        />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          console.log('Form submitted with message:', message);
          alert(`Form submitted: ${message}`);
        }}
        style={{ marginBottom: '20px' }}
      >
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            backgroundColor: '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Submit Form
        </button>
      </form>
    </div>
  );
}