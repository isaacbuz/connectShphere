// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ContentRegistry
 * @dev Manages content ownership, licensing, and monetization on ConnectSphere
 */
contract ContentRegistry is AccessControl, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    struct Content {
        uint256 id;
        address creator;
        string ipfsHash;
        string contentType; // "text", "image", "video", etc.
        uint256 timestamp;
        bool isActive;
        uint256 likes;
        uint256 shares;
        uint256 reports;
        mapping(address => bool) likedBy;
        mapping(address => bool) reportedBy;
    }

    struct Creator {
        address wallet;
        uint256 reputation;
        uint256 totalContent;
        uint256 totalLikes;
        uint256 totalShares;
        bool isVerified;
        bool isBanned;
    }

    struct License {
        uint256 contentId;
        address licensee;
        uint256 price;
        uint256 duration;
        uint256 startTime;
        bool isExclusive;
        bool isActive;
    }

    // State variables
    Counters.Counter private _contentIdCounter;
    Counters.Counter private _licenseIdCounter;

    mapping(uint256 => Content) public contents;
    mapping(address => Creator) public creators;
    mapping(uint256 => License) public licenses;
    mapping(address => uint256[]) public creatorContents;
    mapping(uint256 => uint256[]) public contentLicenses;

    // Fee configuration
    uint256 public platformFeePercentage = 250; // 2.5%
    address public feeRecipient;

    // Events
    event ContentCreated(
        uint256 indexed contentId,
        address indexed creator,
        string ipfsHash,
        string contentType
    );
    event ContentLiked(uint256 indexed contentId, address indexed user);
    event ContentShared(uint256 indexed contentId, address indexed user);
    event ContentReported(uint256 indexed contentId, address indexed reporter, string reason);
    event ContentRemoved(uint256 indexed contentId, address indexed moderator);
    event CreatorVerified(address indexed creator);
    event CreatorBanned(address indexed creator, string reason);
    event LicenseCreated(
        uint256 indexed licenseId,
        uint256 indexed contentId,
        address indexed licensee,
        uint256 price
    );
    event PlatformFeeUpdated(uint256 newFeePercentage);

    constructor(address _feeRecipient) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MODERATOR_ROLE, msg.sender);
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Create new content entry
     */
    function createContent(
        string calldata ipfsHash,
        string calldata contentType
    ) external whenNotPaused returns (uint256) {
        require(bytes(ipfsHash).length > 0, "Invalid IPFS hash");
        require(!creators[msg.sender].isBanned, "Creator is banned");

        uint256 contentId = _contentIdCounter.current();
        _contentIdCounter.increment();

        Content storage newContent = contents[contentId];
        newContent.id = contentId;
        newContent.creator = msg.sender;
        newContent.ipfsHash = ipfsHash;
        newContent.contentType = contentType;
        newContent.timestamp = block.timestamp;
        newContent.isActive = true;

        // Update creator stats
        creators[msg.sender].wallet = msg.sender;
        creators[msg.sender].totalContent++;
        creatorContents[msg.sender].push(contentId);

        emit ContentCreated(contentId, msg.sender, ipfsHash, contentType);
        return contentId;
    }

    /**
     * @dev Like content
     */
    function likeContent(uint256 contentId) external whenNotPaused {
        require(contents[contentId].isActive, "Content not active");
        require(!contents[contentId].likedBy[msg.sender], "Already liked");
        require(contents[contentId].creator != msg.sender, "Cannot like own content");

        contents[contentId].likes++;
        contents[contentId].likedBy[msg.sender] = true;
        creators[contents[contentId].creator].totalLikes++;

        // Update creator reputation
        _updateReputation(contents[contentId].creator, 1);

        emit ContentLiked(contentId, msg.sender);
    }

    /**
     * @dev Share content
     */
    function shareContent(uint256 contentId) external whenNotPaused {
        require(contents[contentId].isActive, "Content not active");

        contents[contentId].shares++;
        creators[contents[contentId].creator].totalShares++;

        // Update creator reputation
        _updateReputation(contents[contentId].creator, 2);

        emit ContentShared(contentId, msg.sender);
    }

    /**
     * @dev Report content
     */
    function reportContent(uint256 contentId, string calldata reason) external {
        require(contents[contentId].isActive, "Content not active");
        require(!contents[contentId].reportedBy[msg.sender], "Already reported");

        contents[contentId].reports++;
        contents[contentId].reportedBy[msg.sender] = true;

        emit ContentReported(contentId, msg.sender, reason);

        // Auto-remove if reports exceed threshold
        if (contents[contentId].reports >= 10) {
            contents[contentId].isActive = false;
            emit ContentRemoved(contentId, address(this));
        }
    }

    /**
     * @dev Remove content (moderator only)
     */
    function removeContent(uint256 contentId) external onlyRole(MODERATOR_ROLE) {
        require(contents[contentId].isActive, "Content not active");
        
        contents[contentId].isActive = false;
        
        // Penalize creator reputation
        _updateReputation(contents[contentId].creator, -10);
        
        emit ContentRemoved(contentId, msg.sender);
    }

    /**
     * @dev Create content license
     */
    function createLicense(
        uint256 contentId,
        address licensee,
        uint256 duration,
        bool isExclusive
    ) external payable nonReentrant {
        require(contents[contentId].isActive, "Content not active");
        require(contents[contentId].creator == msg.sender, "Not content owner");
        require(licensee != address(0), "Invalid licensee");
        require(msg.value > 0, "Payment required");

        uint256 licenseId = _licenseIdCounter.current();
        _licenseIdCounter.increment();

        // Calculate platform fee
        uint256 platformFee = (msg.value * platformFeePercentage) / 10000;
        uint256 creatorPayment = msg.value - platformFee;

        // Create license
        licenses[licenseId] = License({
            contentId: contentId,
            licensee: licensee,
            price: msg.value,
            duration: duration,
            startTime: block.timestamp,
            isExclusive: isExclusive,
            isActive: true
        });

        contentLicenses[contentId].push(licenseId);

        // Transfer payments
        payable(feeRecipient).transfer(platformFee);
        payable(msg.sender).transfer(creatorPayment);

        emit LicenseCreated(licenseId, contentId, licensee, msg.value);
    }

    /**
     * @dev Verify creator
     */
    function verifyCreator(address creator) external onlyRole(VALIDATOR_ROLE) {
        require(!creators[creator].isVerified, "Already verified");
        require(!creators[creator].isBanned, "Creator is banned");
        
        creators[creator].isVerified = true;
        _updateReputation(creator, 50); // Bonus for verification
        
        emit CreatorVerified(creator);
    }

    /**
     * @dev Ban creator
     */
    function banCreator(address creator, string calldata reason) external onlyRole(MODERATOR_ROLE) {
        require(!creators[creator].isBanned, "Already banned");
        
        creators[creator].isBanned = true;
        
        // Deactivate all creator's content
        uint256[] memory contentIds = creatorContents[creator];
        for (uint256 i = 0; i < contentIds.length; i++) {
            if (contents[contentIds[i]].isActive) {
                contents[contentIds[i]].isActive = false;
            }
        }
        
        emit CreatorBanned(creator, reason);
    }

    /**
     * @dev Update platform fee
     */
    function updatePlatformFee(uint256 newFeePercentage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeePercentage <= 1000, "Fee too high"); // Max 10%
        platformFeePercentage = newFeePercentage;
        emit PlatformFeeUpdated(newFeePercentage);
    }

    /**
     * @dev Update creator reputation
     */
    function _updateReputation(address creator, int256 change) private {
        if (change > 0) {
            creators[creator].reputation += uint256(change);
        } else {
            uint256 decrease = uint256(-change);
            if (creators[creator].reputation > decrease) {
                creators[creator].reputation -= decrease;
            } else {
                creators[creator].reputation = 0;
            }
        }
    }

    /**
     * @dev Get creator's content IDs
     */
    function getCreatorContents(address creator) external view returns (uint256[] memory) {
        return creatorContents[creator];
    }

    /**
     * @dev Get content's license IDs
     */
    function getContentLicenses(uint256 contentId) external view returns (uint256[] memory) {
        return contentLicenses[contentId];
    }

    /**
     * @dev Check if license is valid
     */
    function isLicenseValid(uint256 licenseId) external view returns (bool) {
        License memory license = licenses[licenseId];
        return license.isActive && 
               (block.timestamp <= license.startTime + license.duration);
    }

    /**
     * @dev Check if user liked content
     */
    function hasUserLikedContent(uint256 contentId, address user) external view returns (bool) {
        return contents[contentId].likedBy[user];
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
} 