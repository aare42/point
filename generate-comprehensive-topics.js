const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Comprehensive topic data with realistic learning progressions
const topicData = [
  // ====== FOUNDATION LEVEL (Prerequisites for everything) ======
  { name: "Basic Mathematics", type: "THEORY", keypoints: ["Arithmetic operations", "Basic algebra", "Simple equations", "Number theory fundamentals"] },
  { name: "Computer Literacy", type: "THEORY", keypoints: ["File systems", "Operating systems basics", "Software installation", "Internet navigation"] },
  { name: "Problem Solving Fundamentals", type: "THEORY", keypoints: ["Logical thinking", "Breaking down problems", "Pattern recognition", "Algorithm basics"] },
  
  // ====== PROGRAMMING FUNDAMENTALS ======
  { name: "Programming Concepts", type: "THEORY", keypoints: ["Variables and data types", "Control structures", "Functions", "Basic syntax"], prereqs: ["Problem Solving Fundamentals"] },
  { name: "Python Programming", type: "PRACTICE", keypoints: ["Python syntax", "Lists and dictionaries", "Loops and conditionals", "Function definition"], prereqs: ["Programming Concepts"] },
  { name: "JavaScript Fundamentals", type: "PRACTICE", keypoints: ["ES6 syntax", "DOM manipulation", "Event handling", "Async programming"], prereqs: ["Programming Concepts"] },
  { name: "Git Version Control", type: "PRACTICE", keypoints: ["Repository management", "Branching and merging", "Collaboration workflows", "Command line basics"], prereqs: ["Computer Literacy"] },
  
  // ====== WEB DEVELOPMENT FOUNDATION ======
  { name: "HTML Structure", type: "THEORY", keypoints: ["Semantic markup", "Document structure", "Forms and inputs", "Accessibility basics"], prereqs: ["Computer Literacy"] },
  { name: "CSS Styling", type: "PRACTICE", keypoints: ["Selectors and properties", "Layout with Flexbox", "Responsive design", "CSS Grid"], prereqs: ["HTML Structure"] },
  { name: "Web Design Principles", type: "THEORY", keypoints: ["User experience", "Visual hierarchy", "Color theory", "Typography"], prereqs: ["HTML Structure"] },
  
  // ====== ADVANCED WEB DEVELOPMENT ======
  { name: "React Framework", type: "PRACTICE", keypoints: ["Components and JSX", "State management", "Props and hooks", "Event handling"], prereqs: ["JavaScript Fundamentals", "CSS Styling"] },
  { name: "Node.js Runtime", type: "PRACTICE", keypoints: ["Server-side JavaScript", "NPM package management", "File system operations", "HTTP modules"], prereqs: ["JavaScript Fundamentals"] },
  { name: "Express.js Server", type: "PRACTICE", keypoints: ["REST API design", "Middleware implementation", "Route handling", "Error management"], prereqs: ["Node.js Runtime"] },
  { name: "Database Fundamentals", type: "THEORY", keypoints: ["Relational concepts", "SQL basics", "Data modeling", "CRUD operations"], prereqs: ["Basic Mathematics"] },
  { name: "MongoDB NoSQL", type: "PRACTICE", keypoints: ["Document databases", "Query operations", "Indexing", "Aggregation pipelines"], prereqs: ["Database Fundamentals"] },
  { name: "PostgreSQL Relational DB", type: "PRACTICE", keypoints: ["Advanced SQL", "Joins and relationships", "Transactions", "Performance optimization"], prereqs: ["Database Fundamentals"] },
  
  // ====== DATA SCIENCE TRACK ======
  { name: "Statistics Foundations", type: "THEORY", keypoints: ["Descriptive statistics", "Probability distributions", "Hypothesis testing", "Correlation analysis"], prereqs: ["Basic Mathematics"] },
  { name: "Data Analysis with Pandas", type: "PRACTICE", keypoints: ["Data cleaning", "DataFrame operations", "Statistical analysis", "Data visualization"], prereqs: ["Python Programming", "Statistics Foundations"] },
  { name: "NumPy Mathematical Computing", type: "PRACTICE", keypoints: ["Array operations", "Mathematical functions", "Linear algebra", "Broadcasting"], prereqs: ["Python Programming", "Basic Mathematics"] },
  { name: "Matplotlib Visualization", type: "PRACTICE", keypoints: ["Plot creation", "Chart customization", "Statistical plots", "Publication-ready figures"], prereqs: ["Data Analysis with Pandas"] },
  { name: "Machine Learning Basics", type: "THEORY", keypoints: ["Supervised learning", "Unsupervised learning", "Model evaluation", "Feature engineering"], prereqs: ["Statistics Foundations", "NumPy Mathematical Computing"] },
  { name: "Scikit-learn Implementation", type: "PRACTICE", keypoints: ["Model training", "Cross-validation", "Hyperparameter tuning", "Pipeline creation"], prereqs: ["Machine Learning Basics", "Data Analysis with Pandas"] },
  
  // ====== COMPUTER SCIENCE FUNDAMENTALS ======
  { name: "Data Structures", type: "THEORY", keypoints: ["Arrays and lists", "Stacks and queues", "Trees and graphs", "Hash tables"], prereqs: ["Programming Concepts"] },
  { name: "Algorithms Design", type: "THEORY", keypoints: ["Sorting algorithms", "Search algorithms", "Recursion", "Time complexity"], prereqs: ["Data Structures", "Basic Mathematics"] },
  { name: "Object-Oriented Programming", type: "THEORY", keypoints: ["Classes and objects", "Inheritance", "Polymorphism", "Encapsulation"], prereqs: ["Programming Concepts"] },
  { name: "Software Design Patterns", type: "THEORY", keypoints: ["Creational patterns", "Structural patterns", "Behavioral patterns", "SOLID principles"], prereqs: ["Object-Oriented Programming"] },
  
  // ====== CYBERSECURITY TRACK ======
  { name: "Network Fundamentals", type: "THEORY", keypoints: ["TCP/IP protocol", "OSI model", "Network topologies", "Routing basics"], prereqs: ["Computer Literacy"] },
  { name: "Cybersecurity Basics", type: "THEORY", keypoints: ["Threat landscape", "Security principles", "Risk assessment", "Incident response"], prereqs: ["Network Fundamentals"] },
  { name: "Cryptography Principles", type: "THEORY", keypoints: ["Symmetric encryption", "Asymmetric encryption", "Hash functions", "Digital signatures"], prereqs: ["Basic Mathematics", "Cybersecurity Basics"] },
  { name: "Ethical Hacking", type: "PRACTICE", keypoints: ["Penetration testing", "Vulnerability assessment", "Social engineering", "Security tools"], prereqs: ["Cybersecurity Basics", "Network Fundamentals"] },
  
  // ====== MOBILE DEVELOPMENT ======
  { name: "Mobile Development Concepts", type: "THEORY", keypoints: ["Platform differences", "App lifecycle", "User interface design", "Performance considerations"], prereqs: ["Programming Concepts"] },
  { name: "React Native Development", type: "PRACTICE", keypoints: ["Cross-platform development", "Native modules", "Navigation", "State management"], prereqs: ["React Framework", "Mobile Development Concepts"] },
  { name: "iOS Swift Programming", type: "PRACTICE", keypoints: ["Swift language", "Xcode development", "iOS frameworks", "App Store deployment"], prereqs: ["Mobile Development Concepts", "Object-Oriented Programming"] },
  { name: "Android Kotlin Development", type: "PRACTICE", keypoints: ["Kotlin language", "Android Studio", "Activity lifecycle", "Google Play deployment"], prereqs: ["Mobile Development Concepts", "Object-Oriented Programming"] },
  
  // ====== CLOUD & DEVOPS ======
  { name: "Cloud Computing Concepts", type: "THEORY", keypoints: ["IaaS, PaaS, SaaS", "Scalability", "High availability", "Cloud security"], prereqs: ["Network Fundamentals"] },
  { name: "Docker Containerization", type: "PRACTICE", keypoints: ["Container creation", "Dockerfile syntax", "Image management", "Container orchestration"], prereqs: ["Computer Literacy", "Git Version Control"] },
  { name: "AWS Cloud Platform", type: "PRACTICE", keypoints: ["EC2 instances", "S3 storage", "Lambda functions", "CloudFormation"], prereqs: ["Cloud Computing Concepts"] },
  { name: "DevOps Practices", type: "THEORY", keypoints: ["CI/CD pipelines", "Infrastructure as code", "Monitoring", "Automation"], prereqs: ["Git Version Control", "Cloud Computing Concepts"] },
  { name: "Kubernetes Orchestration", type: "PRACTICE", keypoints: ["Pod management", "Service discovery", "Scaling", "Deployment strategies"], prereqs: ["Docker Containerization", "DevOps Practices"] },
  
  // ====== ADVANCED PROJECTS ======
  { name: "RESTful API Development", type: "PROJECT", keypoints: ["API design", "Authentication", "Rate limiting", "Documentation"], prereqs: ["Express.js Server", "Database Fundamentals"] },
  { name: "E-commerce Web Application", type: "PROJECT", keypoints: ["Shopping cart", "Payment integration", "User authentication", "Order management"], prereqs: ["React Framework", "RESTful API Development", "PostgreSQL Relational DB"] },
  { name: "Data Science Portfolio", type: "PROJECT", keypoints: ["End-to-end analysis", "Predictive modeling", "Data visualization", "Report generation"], prereqs: ["Scikit-learn Implementation", "Matplotlib Visualization"] },
  { name: "Mobile App MVP", type: "PROJECT", keypoints: ["User interface design", "Core functionality", "Testing", "App store deployment"], prereqs: ["React Native Development"] },
  { name: "Cloud-Native Application", type: "PROJECT", keypoints: ["Microservices architecture", "Auto-scaling", "Monitoring", "High availability"], prereqs: ["Kubernetes Orchestration", "AWS Cloud Platform"] },
  { name: "Machine Learning Pipeline", type: "PROJECT", keypoints: ["Data ingestion", "Model training", "Model deployment", "Performance monitoring"], prereqs: ["Scikit-learn Implementation", "Docker Containerization"] },
  { name: "Cybersecurity Assessment", type: "PROJECT", keypoints: ["Security audit", "Vulnerability testing", "Risk analysis", "Remediation plan"], prereqs: ["Ethical Hacking", "Cryptography Principles"] },
  { name: "Full-Stack SaaS Platform", type: "PROJECT", keypoints: ["Multi-tenant architecture", "Subscription management", "Analytics dashboard", "API marketplace"], prereqs: ["E-commerce Web Application", "Cloud-Native Application"] },
  
  // ====== SPECIALIZED ADVANCED TOPICS ======
  { name: "Advanced Algorithms", type: "THEORY", keypoints: ["Dynamic programming", "Graph algorithms", "Optimization", "Computational complexity"], prereqs: ["Algorithms Design", "Data Structures"] },
  { name: "Deep Learning Neural Networks", type: "THEORY", keypoints: ["Neural network architecture", "Backpropagation", "CNN and RNN", "Transfer learning"], prereqs: ["Machine Learning Basics", "Advanced Algorithms"] },
  { name: "Blockchain Technology", type: "THEORY", keypoints: ["Distributed ledger", "Consensus mechanisms", "Smart contracts", "Cryptocurrency"], prereqs: ["Cryptography Principles", "Network Fundamentals"] },
  { name: "Quantum Computing Basics", type: "THEORY", keypoints: ["Quantum mechanics", "Qubits and gates", "Quantum algorithms", "Quantum supremacy"], prereqs: ["Advanced Algorithms", "Basic Mathematics"] },
  { name: "Advanced System Architecture", type: "THEORY", keypoints: ["Distributed systems", "Load balancing", "Caching strategies", "Event-driven architecture"], prereqs: ["Software Design Patterns", "Cloud Computing Concepts"] }
];

async function generateComprehensiveTopics() {
  console.log('🌟 Generating 50 comprehensive topics with realistic learning progressions...');
  
  try {
    // Get current admin user
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return;
    }
    
    console.log(`👤 Using admin user: ${adminUser.name || adminUser.email}`);
    
    // Clear existing topics to avoid conflicts
    await prisma.topicPrerequisite.deleteMany();
    await prisma.studentTopic.deleteMany();
    await prisma.goalTopic.deleteMany();
    await prisma.goalTemplateTopic.deleteMany();
    await prisma.courseTopic.deleteMany();
    await prisma.vacancyTopic.deleteMany();
    await prisma.topic.deleteMany();
    
    console.log('🗑️  Cleared existing topics');
    
    // Create topics first (without prerequisites)
    const createdTopics = new Map();
    
    for (const topicInfo of topicData) {
      const topic = await prisma.topic.create({
        data: {
          name: topicInfo.name,
          slug: topicInfo.name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
          type: topicInfo.type,
          keypoints: JSON.stringify(topicInfo.keypoints),
          description: `Learn ${topicInfo.name.toLowerCase()} - ${topicInfo.keypoints.slice(0, 2).join(', ')} and more.`,
          authorId: adminUser.id
        }
      });
      
      createdTopics.set(topicInfo.name, topic);
      console.log(`📝 Created topic: ${topic.name} (${topic.type})`);
    }
    
    // Create prerequisites
    let prerequisiteCount = 0;
    for (const topicInfo of topicData) {
      if (topicInfo.prereqs && topicInfo.prereqs.length > 0) {
        const topic = createdTopics.get(topicInfo.name);
        
        for (const prereqName of topicInfo.prereqs) {
          const prerequisiteTopic = createdTopics.get(prereqName);
          
          if (prerequisiteTopic) {
            await prisma.topicPrerequisite.create({
              data: {
                topicId: topic.id,
                prerequisiteId: prerequisiteTopic.id
              }
            });
            prerequisiteCount++;
            console.log(`🔗 Created prerequisite: ${prereqName} → ${topicInfo.name}`);
          }
        }
      }
    }
    
    // Generate statistics
    const stats = {
      total: topicData.length,
      theory: topicData.filter(t => t.type === 'THEORY').length,
      practice: topicData.filter(t => t.type === 'PRACTICE').length,
      project: topicData.filter(t => t.type === 'PROJECT').length,
      prerequisites: prerequisiteCount
    };
    
    console.log('\n🎉 Successfully generated comprehensive topic graph!');
    console.log('\n📊 Statistics:');
    console.log(`   📚 Theory topics: ${stats.theory}`);
    console.log(`   ⚙️  Practice topics: ${stats.practice}`);
    console.log(`   🚀 Project topics: ${stats.project}`);
    console.log(`   🔗 Total prerequisites: ${stats.prerequisites}`);
    console.log(`   📈 Total topics: ${stats.total}`);
    
    console.log('\n🎯 Learning Tracks Created:');
    console.log('   • Web Development (HTML → CSS → JavaScript → React → Full-Stack)');
    console.log('   • Data Science (Python → Pandas → ML → Deep Learning)');
    console.log('   • Mobile Development (Concepts → React Native/iOS/Android)');
    console.log('   • Cloud & DevOps (Docker → Kubernetes → AWS)');
    console.log('   • Cybersecurity (Networks → Security → Cryptography → Ethical Hacking)');
    console.log('   • Computer Science (Data Structures → Algorithms → Design Patterns)');
    
    console.log('\n✨ Ready to explore the enhanced knowledge graph!');
    
  } catch (error) {
    console.error('❌ Error generating topics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateComprehensiveTopics();